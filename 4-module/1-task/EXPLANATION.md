# HTTP-Server, объекты стримов req и res

Документация к модулю [http](https://nodejs.org/dist/latest/docs/api/http.html).
Документация к модулю [stream](https://nodejs.org/dist/latest-v12.x/docs/api/stream.html).

## Файловый сервер - отдача файла

Для того, чтобы отдать файл пользователю, необходимо создать стрим для чтения из файла 
с помощью функции `createReadStream` модуля `fs` и перенаправить его вывод в поток для записи `res`, 
который является также потоком ответа сервера. У нас уже есть переменная `filepath`, 
которая содержит путь до файла, так что код будет выглядеть следующим образом:

```js

const stream = fs.createReadStream(filepath);
stream.pipe(res);

```

Основная задача выполнена, однако остаются несколько моментов, про которые легко забыть, но которые очень 
серьезно могут повлиять на надежность нашего сервера. Это обработка возможных ошибок, 
а также потенциальная ситуация обрыва соединения клиентом.

В данном случае при обработке ошибок нам особенно интересна ситуация когда она возникает по причине отсутствия файла, 
т.к. в этом случае мы должны вернуть специальный статус `404`. 
Отследить именно эту ошибку нам поможет свойство `code`, которое содержит код ошибки. 
В модуле errors можно посмотреть все коды системных ошибок и их описание, нас интересует ошибка с кодом `ENOENT`, 
во всех остальных случаях будем просто отдавать стандартный для таких случаев статус ответа `500`.

```js

stream.on('error', (error) => {
  if (error.code === 'ENOENT') {
    res.statusCode = 404;
    res.end('File not found');
  } else {
    res.statusCode = 500;
    res.end('Internal server error');
  }
});

```

Ситуация обрыва соединения не так критична для работы нашего сервера, т.к. никаких ошибок не произойдет, 
а Node.JS продолжит считывать потоково файл до самого конца. Однако мы можем избежать этой ненужной работы 
и потратить ресурсы сервера на более полезные задачи.

Закрытие соединения можно отследить с помощью события `close`, и, если в этот момент обработка запроса 
ещё не завершена (свойство `finished` равняется `false`), значит произошел обрыв. 
В этом случае нам достаточно вызвать метод `.destroy` у объекта файлового стрима для того, 
чтобы высвободить занимаемые им ресурсы.

```js

res.on('close', () => {
  if (res.finished) return;
  stream.destroy();
});

```

Проверку вложенных папок можно выполнить просто проверкой наличия слешей или точек в ссылке запроса:

```js

if (pathname.includes('/') || pathname.includes('..')) {
  res.statusCode = 400;
  res.end('Nested paths are not allowed');
}

```