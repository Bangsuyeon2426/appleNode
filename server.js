//npm init -y
//npm install express
//npm install -g nodemon
//nodemon server.js
//npm install mongodb@5
//npm install ejs
//npm install method-override

//express 라이브러리 사용하겠단 뜻
const express = require('express');
const app = express();

//npm install method-override
const methodOverride = require('method-override')
app.use(methodOverride('_method'))

//폴더를 server.js에 등록해두면 폴더안의 파일을 html에서 사용가능
app.use(express.static(__dirname + '/public'))
//다른폴더도 넣고싶다면
//app.use(express.static(__dirname + '/public2'))

//html파일에 서버데이터 넣는 방법 => template engine(ejs)
app.set('view engine', 'ejs')

// 2.서버는 글을 출력해보고 검사 (요청.body) 쓰기위한 사전 셋팅
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

//.env 파일에 환경변수 보관하려면
//npm install dotenv
require('dotenv').config()

//서버와 MongoDB 연결하기 위한 셋팅 코드(클라이언트=>컬렉션=>도큐먼트)
const { MongoClient, ObjectId } = require('mongodb')
let connectDB = require('./database.js') //database.js 파일 경로
let db;
connectDB.then((client) => {
    console.log('DB연결성공')
    db = client.db('forum');
    app.listen(process.env.PORT, () => {
        console.log('http://localhost:8080 에서 서버 실행중');
    })
}).catch((err) => {
    console.log(err)
})

//(회원가입,로그인) passport 라이브러리 셋팅
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
//세션을 DB에 저장하려면 connect-mongo: npm install connect-mongo 
const MongoStore = require('connect-mongo')

app.use(passport.initialize())
app.use(session({
    secret: '암호화에 쓸 비번',
    resave: false,
    saveUninitialized: false,
    //세션 유효기간 설정가능 (아래예시는 1시간 후 로그아웃)
    cookie: { maxAge: 60 * 60 * 1000 },
    //세션을 db에 저장하려면 connect-mongo
    store: MongoStore.create({
        mongoUrl: process.env.DB_URL,
        dbName: 'forum'
    })
}))

app.use(passport.session())

//이미지업로드 라이브러리 셋팅
const { S3Client } = require('@aws-sdk/client-s3')
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

//HASGING
//npm install bcrypt
const bcrypt = require('bcrypt')

//서버 띄우는 코드
//네 컴퓨터 PORT 하나 오픈하는 문법(다른 사람 들어오도록 컴퓨터에 구멍 뚫어 놓기)
// app.listen(8080, () => {
//     console.log('http://localhost:8080 에서 서버 실행중');
// })

//로그인 여부 확인하는 "미들웨어" 함수 생성해보기
function checkLogin(요청, 응답, next) {
    if (!요청.user) {
        응답.send('로그인하세요'); // 로그인 페이지로 리다이렉트 또는 다른 처리
        return; // 여기서 중단
    }
    //미들웨어 코드실행 끝났으니 다음으로 이동해주세요
    next()
}
//app.use로 middleware 일괄등록하기 (일일히 미들웨어 다 넣기 귀찮으니까)
//app.use(checkLogin) //이 코드 밑에 있는 모든 API들은 요청,응답 사이에 middleware 실행 
//app.use('/write', checkLogin) //원하는 route에만 실행


//간단한 서버기능
//__dirname : server.js 담긴 폴더 (현재폴더..절대경로)
app.get('/', checkLogin, (req, res) => {
    //checkLogin(req, res) 위에 껴넣어서 쓰는 거랑 똑같아
    res.sendFile(__dirname + '/index.html')
})

app.get('/news', (req, res) => {
    //접속하면 db에 뭔가 저장!!
    db.collection('post').insertOne({ title: '어쩌구' })
    //res.send('오늘 비옴')
})

//누가 /list 로 시작하는 API로 요청시 현재 시간을 터미널에 출력하고 싶으면?
app.use('/list', (요청, 응답, next) => {
    console.log(new Date())
    next()
})//그냥 app.use 그 자리에서 함수 만들어 넣어도 상관없음

app.get('/list', async (req, res) => {
    //DB에 있는 collection의 '모든 document' 출력하는 법!!!
    let result = await db.collection('post').find().toArray()

    // 로그인 여부 확인
    let user = null;
    if (req.user) {
        // 사용자 정보가 있다면 해당 사용자의 정보를 가져옴
        user = await db.collection('user').findOne({ _id: new ObjectId(req.user._id) });
    }
    console.log(user);
    //ejs는 sendFile이 아니라 'render'
    //서버데이터를 ejs파일에 넣으려면
    //1.ejs 파일로 데이터 전송
    //2.ejs 파일 안에서 <%=데이터이름%>
    res.render('list.ejs', { 글목록: result, user: user }) //글목록은 작명한 거 => ejs파일 안에서 사용
})

app.get('/about', (req, res) => {
    res.sendFile(__dirname + '/about.html')
})

app.get('/time', (req, res) => {
    res.render('time.ejs', { 시간: new Date() })
})

// 상세페이지 만들기 1 (URL parameter)
//1./detail/:aaaa 접속하면
//2.{_id: aaaa}글을 DB에서 찾아서
//3.ejs파일에 박아서 보내줌
app.get('/detail/:id', async (req, res) => {
    try {
        //댓글 작성 페이지
        //parentId 필드가 req.params.id와 일치하는 댓글을 데이터베이스에서 찾아 반환
        let result2 = await db.collection('comment').
            find({ parentId: new ObjectId(req.params.id) }).toArray()

        //req.params //:id를 가리킴 (유저가 url파라미터 자리에 입력한 데이터)
        let result = await db.collection('post').
            findOne({ _id: new ObjectId(req.params.id) }) //맨앞 document 1개
        //await db.collection('post').toArray() //모든 document 가져옴
        console.log(req.params);
        res.render('detail.ejs', { result: result, result2: result2 });

        //예외처리:id == null
        if (result == null) {
            res.status(400).send('올바르지 않은 경로입니다.')
        }
    } catch (e) {
        //에러메시지
        console.log(e);
        //5XX:서버문제, 4XX:유저문제
        res.status(400).send('올바르지 않은 경로입니다.')
    }
})

//수정기능 만들기
app.get('/edit/:id', async (req, res) => {
    let result = await db.collection('post').findOne({ _id: new ObjectId(req.params.id) })
    console.log(result);
    res.render('edit.ejs', { result: result })
})

app.put('/edit', async (req, res) => {
    //수정할 docu, 수정할 내용
    //req.body 안에는 유저가 input안에 쓴 글들이 담겨져있다.
    // 서버에 없는 정보는 유저에게 보내라고 하거나
    // DB에서 뽑아보거나 둘 중 하나 하면 보통 해결됩니다.  
    // "어떤 document를 수정하고 싶은지"는 서버는 모르고 유저만 알고있기 때문에 유저에게 보내라고 하면 됩니다. 
    // 유저에게 수정할 글의 _id를 보내라고 합시다.

    try {
        // const currentUserId = req.user.id;
        // const post = await db.collection('post').findOne({_id:new ObjectId(req.body.id)});
        // const postUserID =post.user;
        const currentUserId = req.user._id;
        console.log(req.body.id, currentUserId)
        let result = await db.collection('post').updateOne(
            {
                _id: new ObjectId(req.body.id),
                user: new ObjectId(currentUserId)
            },
            { $set: { title: req.body.title, content: req.body.content } }
        );
        console.log(result);

        if (result.matchedCount > 0) {
            return res.redirect('/list')
        } else {
            return res.status(404).send('수정할 문서가 없습니다.')
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('서버 에러 발생');
    }
})

//method override : <form>에서 PUT, DELETE 요청할 수 있는 법(좀 이쁜 API)
//npm install method-override

//좋아요 기능
// app.put('/edit', async (req, res) => {
//     await db.collection('post').updateOne({ _id: 1 },
//         //inc :기존값에 +/- 하라는 뜻
//         { $inc: { like: -2 } })
// })
//여러 document 동시 수정은 updateMany
// db.collection('컬렉션명').updateMany(
//     { like : { $gt: 5 } }, (greater than(10초과인거찾아줌)) =>'필터링'이라고함
//     { $set: { like : 100 } }
//   )

// app.post('/abc', async (req, res) => {
//     console.log('안녕');
//     console.log(req.body);
// })

//서버로 데이터 전송하는 여러가지 방법
//1.query string
//2.URL parameter :app.get('/abc:id'=>:id 필요
// app.get('/abc', async (req, res) => {
//     //URL parameter
//     //console.log(req.params);
//     //query string
//     console.log(req.query); //쿼리스트링으로 요청받은거 출력하는법
// })

//2.서버는 요청받으면 document 삭제
app.delete('/delete', async (req, res) => {
    //console.log(req.query);
    //db에 있던 document 삭제하기
    await db.collection('post').deleteOne({
        _id: new ObjectId(req.query.docid),//1. _id : 유저가보낸 글 _id
        user: new ObjectId(req.user_id)//2. user : 지금 로그인중인 유저의 _id
    })
    //(참고) ajax 요청 사용시 응답.redirect, 응답.render 사용안하는게 나음
    res.send('삭제완료') //ajax는 그냥 메시지만
})


//페이지네이션
//url파라미터 이용해보자 :id
{/* <a href='list/1'> */ }
const postsPerPage = 5;

app.get('/list/:id', async (req, res) => {
    try {
        // 전체 글 수 계산
        const totalPosts = await db.collection('post').countDocuments();

        // 현재 페이지에 표시될 글 목록 가져오기
        const currentPage = parseInt(req.params.id, 10);
        const result = await db.collection('post')
            .find()
            .skip((currentPage - 1) * postsPerPage)
            .limit(postsPerPage)
            .toArray();

        // 전체 페이지 수 계산
        const totalPages = Math.ceil(totalPosts / postsPerPage);

        // 클라이언트에 전체 페이지 수와 현재 페이지 전송
        res.render('list.ejs', {
            글목록: result,
            totalPages: totalPages,
            currentPage: currentPage
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

//skip말고 다른 방법
app.get('/list/next/:id', async (req, res) => {
    //1번부터 5번째 글 찾아서 result 변수에 저장하기
    let result = await db.collection('post')
        .find({ _id: { $gt: new ObjectId(req.params.id) } })
        .limit(5).toArray()
    res.render('list.ejs', { 글목록: result })
})


//회원기능 만들기 1 (passport, 로그인기능)
//session 방식
//1.가입기능 2.로그인기능 3.로그인 완료시 세션만들기 4.로긴완료시 유저에게 입장권보내줌
//npm install express-session passport passport-local

//제출한 아이디/비번 검사하는 코드
passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db.collection('user').findOne({ username: 입력한아이디 })
    if (!result) {
        return cb(null, false, { message: '아이디 DB에 없음' })
    }
    //db는 해싱된 상태, 입력한비번도 해싱되야 비교가능
    //result.password == 입력한비번 => compare로 변경 (treu,false)
    if (await bcrypt.compare(입력한비번, result.password)) {
        return cb(null, result)
    } else {
        return cb(null, false, { message: '비번불일치' });
    }
}))

//로그인 성공시 세션을 만들어주기(자동)
passport.serializeUser((user, done) => {
    console.log(user);
    process.nextTick(() => {
        //아래내용 적어서 세션 document를 DB에 발행해줌
        //- done() 함수의 둘째 파라미터에 적은 정보는 세션 document에 기록됩니다.
        done(null, { id: user._id, username: user.username })
    })
})
//유저가 보낸 쿠키 분석 => 현재 로그인된 유저정보를 모든 API의 요청.user에 담아준다 
passport.deserializeUser(async (user, done) => {
    let result = await db.collection('user').findOne({ _id: new ObjectId(user.id) })
    delete result.password
    process.nextTick(() => {
        return done(null, result)
    })
})

app.get('/login', async (요청, 응답) => {
    //제출한아이디/비번이 DB에 있는거랑 일치하는지 확인하고 세션생성
    console.log(요청.user);
    응답.render('login.ejs')
})

function 아이디비번체크(요청, 응답, next) {
    if (요청.body.username == '' || 요청.body.password == '') {
        응답.send('그러지마세요')
    } else {
        next();
    }
}

app.post('/login', 아이디비번체크, async (요청, 응답, next) => {
    //passport.authenticate('local', 콜백함수)(요청, 응답, next) :
    //아이디/비번을 db와 비교하는 코드 실행
    passport.authenticate('local', (error, user, info) => {
        if (error)
            return 응답.status(500).json(error);
        if (!user)
            return 응답.status(401).json(info.message);
        요청.logIn(user, (err) => {
            if (err) {
                console.log("로그인 에러:", err);
                return next(err);
            }
            console.log("로그인 성공");
            // 로그인 완료시 실행할 코드
            응답.redirect('/');
        });
    })(요청, 응답, next)
})

// mypage !
app.get('/mypage', async (요청, 응답) => {
    //console.log(요청.user);
    응답.render('mypage.ejs', { user: 요청.user })
})
//로그인 통과 : isloggenIn
function isLoggedIn(req, res, next) {
    // 사용자가 로그인되어 있는지 확인
    if (req.isAuthenticated()) {
        return next(); // 로그인되어 있으면 다음 미들웨어로 진행
    }
    // 로그인되어 있지 않으면 로그인 페이지로 리다이렉트
    res.redirect('/login');
}

//회원가입 register
app.get('/register', (요청, 응답) => {
    응답.render('register.ejs')
})
app.post('/register', async (요청, 응답) => {
    //비크립트 해시
    let 해시 = await bcrypt.hash(요청.body.password, 10)
    // console.log(해시);
    try {
        //username 빈칸 확인
        if (!요청.body.username || !요청.body.password) {
            throw new Error('아이디와 비번을 모두 입력하세요');
        }
        //같은 username 존재 확인
        const existingUser = await db.collection('user').findOne({ username: 요청.body.username });
        if (existingUser) {
            throw new Error('이미 사용 중인 아이디입니다.');
        }
        //비밀번호 길이 확인
        if (요청.body.password.length < 6) {
            throw new Error('비밀번호는 최소 6자 이상이어야 합니다.')
        }
        //모든 예외 통과시 , 사용자 등록
        await db.collection('user').insertOne({
            username: 요청.body.username,
            password: 해시
        })
        응답.redirect('/')
    }
    catch (error) {
        console.log(error.message);
        응답.status(400).send(error.message);
    }
})

//이미지업로드
//npm install multer multer-s3 @aws-sdk/client-s3 

//다른 파일안에 API를 보관하는 법 : shop.js를 import해오기
app.use('/shop', require('./routes/shop')) //미들웨어식으로 

//board
app.use('/board/sub', require('./routes/board'))

//chat
app.use('/chat', require('./routes/chat.js'))

//검색기능 
app.get('/search', async (요청, 응답) => {
    console.log(요청.query.val);
    if (!요청.query.val) {
        // 검색어가 비어 있다면 에러 메시지 또는 다른 조치를 취함
        return 응답.status(400).send('검색어를 입력하세요.');
    }
    let 검색조건 = [{
        $search: {
            index: 'title_index',
            text: { query: 요청.query.val, path: 'title' }
        }
    }
        //{ $sort: { _id: 1 } },
        // { $limit: 10 }, //페이지 네이션 구현가능
        // { $project: { 제목: 1, _id: 0 } }
    ]
    //정규식으로 특정문자가 포함된 모든 document 찾아오기
    try {
        let result = await db.collection('post').aggregate(검색조건).toArray();
        응답.render('search.ejs', { 글목록: result })
    } catch (error) {
        console.log('검색 오류', error);
        응답.status(500).send('검색 중 오류가 발생했습니다.')
    }
})


//**Node+Express 서버와 React 연동하려면
const path = require('path')
app.use(express.static(path.join(__dirname, 'react-project/build')));
//리액트와 nodejs 서버간 ajax 요청  // npm install cors
app.use(express.json());
var cors = require('cors');
app.use(cors());
app.get('/react', function (요청, 응답) {
    //react-project 안에 build안에 index.html
    응답.sendFile(path.join(__dirname, 'react-project/build/index.html'));
})
//1.DB데이터 뽑아서 보내주는 API 작성 2.react는 여기로 get 요청
app.get('/product', function (요청, 응답) {
    응답.json({ name: 'black shoes' })
})

//리액트가 라우팅하게 전권을 넘기고 싶다면(가장 하단에 놓기)
app.get('*', function (요청, 응답) {
    응답.sendFile(path.join(__dirname, '/react-project/build/index.html'));
})

