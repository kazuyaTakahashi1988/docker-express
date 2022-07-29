docker-compose.yml ファイルがある場所でターミナルを開き、以下のコマンドを叩く　　

※　ポート番号　80　/　3000　をそれぞれ使用します
```
$ docker-compose up -d　
```
　　　　　↓↓↓↓
     
# Open "[http://localhost](http://localhost/)" in your browser　
アイパス『 root 』でphpMyAdminにログインできます。

DB『 express_db 』を作成、照合順序は『 utf8_general_ci 』としてください。

　　　　　↓↓↓↓　　
     
再度 docker-compose.yml ファイルがある場所でターミナルを開き、以下のコマンドを順に叩く

```
$ docker exec -it express-app /bin/sh
$ npx sequelize-cli db:migrate
$ npx sequelize-cli db:seed:all
```

　　　　　↓↓↓↓
# Open "[http://localhost:3000](http://localhost:3000/)" in your browser　
