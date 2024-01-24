const router = require('express').Router()

const { ObjectId } = require('mongodb');
let connectDB = require('../database.js')

let db;
connectDB.then((client) => {
    console.log('DB연결성공')
    db = client.db('forum');
}).catch((err) => {
    console.log(err)
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

// 실시간 채팅구현
//1.채팅방 누르면 채팅방 발행
router.get('/request', isLoggedIn, async (요청, 응답) => {
    //console.log(요청.user._id, 요청.query.writerId);
    //doucument 발행
    await db.collection('chatroom').insertOne({
        //내 아이디(요청인),글쓴이(요청당한사람)
        member: [요청.user._id, new ObjectId(요청.query.writerId)],
        date: new Date()
    })
    응답.redirect('/chat/list')
})

router.get('/list', async (요청, 응답) => {
    //내가 속한 채팅방들을 db에서 꺼내오기
    let result = await db.collection('chatroom')
        .find({ member: 요청.user._id }).toArray()
    응답.render('chatList.ejs', { 채팅목록: result })
})

//채팅방 제목 누르면 상세페이지
router.get('/detail/:id', async (요청, 응답) => {
    try {
        // 유저가 파라미터 자리에 입력한 채팅방 ID
        const chatroomId = new ObjectId(요청.params.id);

        // 현재 로그인한 사용자의 ID
        const userId = new ObjectId(요청.user._id);

        // 속한 채팅방인지 확인
        const isUserInChatroom = await db.collection('chatroom').findOne({
            _id: chatroomId,
            member: userId
        });

        // 속한 채팅방이 아니면 예외 처리
        if (!isUserInChatroom) {
            throw new Error('해당 채팅방에 참여하고 있지 않습니다.');
        }

        // 속한 채팅방이 맞으면 상세페이지 렌더링
        응답.render('chatDetail.ejs', { 채팅방상세페이지: isUserInChatroom });
    } catch (error) {
        console.log(error);
        응답.status(403).send('채팅방에 접근할 권한이 없습니다.')
    }

    //유저가 파라미터 자리에 입력한 거
    // let result = await db.collection('chatroom').findOne({ _id: new ObjectId(요청.params.id) })
    // 응답.render('chatDetail.ejs', { 채팅방상세페이지: result })
})

module.exports = router //export