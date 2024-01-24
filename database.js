const { MongoClient } = require("mongodb");

const url = process.env.DB_URL; //db연결url
let connetDB = new MongoClient(url).connect()

module.exports = connetDB

//db연결하는 코드를 아예 다른 파일로 빼기
//그래야 다른 router 에서도 자유롭게 쓰기 가능 