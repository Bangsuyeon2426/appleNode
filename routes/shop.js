const router = require('express').Router()

let connectDB = require('../database.js')

let db;
connectDB.then((client) => {
    console.log('DB연결성공')
    db = client.db('forum');
}).catch((err) => {
    console.log(err)
})

router.get('/shirts', async (요청, 응답) => {
    await db.collection('post').find().toArray()
    응답.send('셔츠파는 페이지')
})
router.get('/pants', (요청, 응답) => {
    응답.send('바지파는 페이지')
})

module.exports = router //export

//Router 사용법
// 1. 셋팅용으로 router라는 변수 생성
// 2. app.어쩌구들을 전부 router.어쩌구로 바꾸고
// 3. 마지막에 export
// 4. server.js로 require 하기

//공통된 URL 시작 부분은 축약가능
//미들웨어에 shop
//app.use('/shop', require('./routes/shop')) 