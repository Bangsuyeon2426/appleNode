const router = require('express').Router()

let connectDB = require('../database.js')

let db;
connectDB.then((client) => {
    console.log('DB연결성공 게시판');
    db = client.db('forum');
}).catch((err) => {
    console.log(err);
})

//이미지업로드 라이브러리 셋팅
const { S3Client } = require('@aws-sdk/client-s3');
const { ObjectId } = require('mongodb');
const multer = require('multer')
const multerS3 = require('multer-s3')
const s3 = new S3Client({
    region: 'ap-northeast-2', //서울
    credentials: {
        accessKeyId: process.env.S3_KEY, //내거
        secretAccessKey: process.env.S3_SECRET, //쓰기
        //털리면 안되니까 env로 (깃에는 env 업로드 XXX!!)
    }
})

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'suyeon1forum1', //내 버킷이름 
        key: function (요청, file, cb) {
            cb(null, Date.now().toString()) //업로드시 파일명 변경가능
        }
    })
})


//로그인 여부 확인하는 "미들웨어" 함수 생성해보기
function checkLogin(요청, 응답, next) {
    if (!요청.user) {
        응답.send('로그인하세요'); // 로그인 페이지로 리다이렉트 또는 다른 처리
        return; // 여기서 중단
    }
    //미들웨어 코드실행 끝났으니 다음으로 이동해주세요
    next()
}

//로그인 통과 : isloggenIn
function isLoggedIn(req, res, next) {
    // 사용자가 로그인되어 있는지 확인
    if (req.isAuthenticated()) {
        return next(); // 로그인되어 있으면 다음 미들웨어로 진행
    }
    // 로그인되어 있지 않으면 로그인 페이지로 리다이렉트
    res.redirect('/login');
}

router.get('/sports', checkLogin, (요청, 응답) => {
    응답.send('스포츠 게시판')
})

router.get('/game', checkLogin, (요청, 응답) => {
    응답.send('게임 게시판')
})

//* 글 발행 기능
router.get('/write', isLoggedIn, (req, res) => {
    res.render('write.ejs')
})
//2.서버는 글을 출력해보고 검사
router.post('/add', async (req, res) => {
    // upload.single('img1') : name:'img1가진 이미지 들어오면 s3에 자동업로드 
    //업로드 완료시 이미지의 url도 생성해줌->req.file 안에 있음
    console.log(req.user, req.body);
    upload.single("img1")(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send('이미지업로드에러');
        }

        //에러가 나는 경우에 특정 코드를 실행하고 싶으면 try catch 문법
        try {
            //예외검사
            if (req.body.title == '') {
                res.send('제목입력안했는데?')
            } if (req.body.content == '') {
                res.send('내용입력안했는데?')
            }
            //MongoDB에 document 추가
            const postObject = {
                title: req.body.title,
                content: req.body.content,
                img: req.file ? req.file.location : '',
                //글 발행시 작성자의 이름이나 _id 같은 것도 기록(삭제방지)
                user: req.user._id,//현재 로그인 된 유저의_id
                username: req.user.username//현재 로그인 된 유저의 아이디
            };
            // 이미지가 있는 경우에만 URL 저장
            // if (req.file && req.file.location) {
            //     postObject.img = req.file.location;
            // }
            await db.collection('post').insertOne(postObject);

            // 이미지 URL과 함께 리스트 페이지로 리다이렉트
            return res.redirect('/list');

        } catch (e) {
            //에러메시지 출력
            console.log(e)
            //에러시 에러코드 전송
            return res.status(500).send('서버에러남')
        }
        // //유저가 보낸 데이터 출력 가능
        // //console.log(req.body);
    })
})

//comment 기능
router.post('/comment', isLoggedIn, async (요청, 응답) => {
    try {
        // if (!요청.params.id) {
        //     응답.send('로그인하세요')
        // }
        await db.collection('comment').insertOne({
            content: 요청.body.content,
            writerId: new ObjectId(요청.user._id),
            writer: 요청.user.username,
            parentId: new ObjectId(요청.body.parentId)
        })
        응답.redirect('back');
    } catch (e) {
        console.log(e);
        return 응답.status(500).send('코멘트에러')
    }
})

module.exports = router