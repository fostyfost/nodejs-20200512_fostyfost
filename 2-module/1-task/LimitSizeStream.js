/*
# Стримы в Node.JS

Материалы по теме стримов:

1. [https://nodejs.org/dist/latest/docs/api/stream.html](
https://nodejs.org/dist/latest/docs/api/stream.html) (английский, официальная документация)

## 2-module 1-task: Стрим с лимитом передачи данных

Для решения этой задачи нам надо в первую очередь посмотреть
[https://nodejs.org/docs/latest/api/stream.html#stream_implementing_a_transform_stream](раздел документации),
который описывает процесс создания собственных классов `Transform` стримов.
Наша задача сводится к тому, чтобы реализовать метод `_tranform`, который будет вызываться каждый раз, когда очередная
порция данных будет передаваться через стрим.

Этот метод получает следующий список параметров:

1. `chunk`: данные, которые передаются через стрим.
Это может быть строка или специальный объект `Buffer`.
В нашей задаче тип этого параметра не важен – прочитав свойство `.length` мы сможем получить размер передаваемых данных,
какого бы типа они не были.
1. `encoding`: кодировка данных, которую мы использовать не будем, т.к. в данной задаче она неважна.
1. `callback`: это функция обратного вызова, которая должна быть вызвана после того,
как будут выполнены все действия по подсчету размера данных. Эта функция принимает два аргумента:
   1. объект ошибки, если что-то пошло не так (или `null`, если все в порядке).
   1. данные, в нашем случае это исходный параметр `chunk`.

Для того, чтобы следить за тем, сколько данных уже было передано через стрим создадим свойство `size`
и будем увеличивать его каждый раз при вызове метода `_transform`.

В свойстве `limit` сохраним значение лимита, которое передается при создании стрима.

Если при очередном вызове значение свойства `size` превысит `limit` нам необходимо вызвать функцию `callback`,
передав туда в качестве первого аргумента инстанс ошибки `LimitExceededError`.

В результате получится следующий код:

```js

const stream = require('stream');
const LimitExceededError = require('./LimitExceededError');

class LimitSizeStream extends stream.Transform {
  constructor(options) {
    super(options);

    this.limit = options.limit;
    this.size = 0;
  }

  _transform(chunk, encoding, callback) {
    this.size += chunk.length;

    if (this.size > this.limit) {
      callback(new LimitExceededError());
    } else {
      callback(null, chunk);
    }
  }
}

module.exports = LimitSizeStream;

```

Это и есть решение исходной задачи. Отдельно стоит отметить метод `_flush`, указанный в документации.
Он не является обязательным для определения в нашем классе стрима,
но может быть очень полезным если после окончания работы стрима нужно высвободить какие-то ресурсы
(если стрим считывает данные из какого-то источника, например).

## Объектный режим

Это дополнительное условие задачи, которое необязательно к выполнению,
однако является довольно важным для полноценного понимания как устроена работа со стримами в Node.JS.

По умолчанию стримы умеют работать либо со строками, либо с бинарными данными,
но порой может быть полезно передавать через стримы объекты, например, когда нашей задачей является парсинг
огромного JSON, содержащего массив с объектами.
В этом случае стрим может быть переведен в объектный режим с помощью опции `objectMode: true`.

Наша текущая реализация при передаче объекта попытается получить у него свойство `.length`
и прибавить его к значению свойства `size`. Логика работы в этом случае будет нарушена,
так как мы должны считать каждый чанк за отдельно взятый объект и прибавлять к значению `size` единицу.

Для Transform и Duplex стримов, опций передается две: `readableObjectMode: true`, `writableObjectMode: true`,
так как они содержат внутри и стрим для чтения, и стрим для записи.

Давайте проверять передается ли опция `readableObjectMode` при создании объекта,
и сохранять эту информацию в отдельном свойстве `isObjectMode`. Далее, при вызове `_transform`
мы сможем проверить в каком режиме работает наш стрим.

```js

const stream = require('stream');
const LimitExceededError = require('./LimitExceededError');

class LimitSizeStream extends stream.Transform {
  constructor(options) {
    super(options);

    this.limit = options.limit;
    this.size = 0;
    this.isObjectMode = !!options.readableObjectMode;
  }

  _transform(chunk, encoding, callback) {
    if (this.isObjectMode) {
      this.size += 1;
    } else {
      this.size += chunk.length;
    }

    if (this.size > this.limit) {
      callback(new LimitExceededError());
    } else {
      callback(null, chunk);
    }
  }
}

module.exports = LimitSizeStream;

```
 */

const stream = require('stream');
const LimitExceededError = require('./LimitExceededError');

class LimitSizeStream extends stream.Transform {
  constructor(options) {
    super(options);
    this.options = options;
    this._chunksLength = 0;
  }

  // noinspection JSUnusedGlobalSymbols
  _transform(chunk, _, callback) {
    if (this._chunksLength >= this.options.limit) {
      this.destroy(new LimitExceededError());
    } else {
      callback(null, chunk);
    }

    this._chunksLength += chunk.length;
  }
}

module.exports = LimitSizeStream;
