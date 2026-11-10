export { lessons } from './course.js';

export const apiDoc=`<p>Скрипт — JavaScript-класс, прикреплённый к объекту. Объект может иметь один Script. Код применяется при следующем запуске.</p>
<h3>События</h3><dl><dt>start()</dt><dd>Один раз перед первым шагом.</dd><dt>update(dt), fixedUpdate(dt)</dt><dd>Оба вызываются с фиксированным шагом 1/60 с, перед физикой. Обычно достаточно одного из них.</dd><dt>onCollisionEnter(other) / onCollisionExit(other)</dt><dd>Начало и конец физического контакта.</dd><dt>onTriggerEnter(other) / onTriggerExit(other)</dt><dd>Вход и выход из триггера.</dd></dl>
<h3>Объект и компоненты</h3><pre>this.transform.x = 120;
this.transform.y = 200;
this.transform.rotation = 30; // градусы
this.getComponent("SpriteRenderer").color = "#f6a664";
const body = this.getComponent("Rigidbody2D");
body.velocity.x = 200;
body.velocity.y = -480;
body.isGrounded; // есть опора снизу
body.addForce(100, 0); // сила на один шаг
body.addImpulse(0, -200); // импульс, кг·пкс/с
this.gameObject.name;
this.gameObject.tag;
this.destroy();</pre>
<h3>Ввод</h3><pre>Input.getAxis("Horizontal"); // A/D, ←/→
Input.getAxis("Vertical");   // W/S, ↑/↓
Input.getKey("Space");      // удержание
Input.getKeyDown("Space");  // первое нажатие
Input.getKey("KeyE");</pre>
<h3>Сцена</h3><pre>Scene.score += 1;
Scene.find("Игрок"); // имя или id, либо null
Scene.findByTag("Coin"); // массив объектов
Scene.win("Победа!");
other.destroy();
Debug.log("Привет!");
Debug.warn("Обратите внимание");</pre>
<h3>Как устроена физика</h3><p>Координаты и размеры — в пикселях; начало в левом верхнем углу, Y растёт вниз. Центр Transform совпадает с центром спрайта. Collider без Rigidbody неподвижен. Триггер не создаёт физического препятствия.</p><p>Это учебная дискретная физика: прямоугольники (в том числе повёрнутые), окружности, масса, трение и отскок. Нет суставов, непрерывного обнаружения столкновений и расчёта вращающего момента при ударах. Очень быстрые объекты могут пролетать сквозь тонкие препятствия. Неравномерный масштаб окружности использует наибольшую ось.</p>
<h3>Горячие клавиши</h3><p>F5 — запуск / остановка · Ctrl+S — сохранить в браузере · Ctrl+Z / Ctrl+Shift+Z — отмена / повтор · Ctrl+D — дубликат · Delete — удалить · F — уместить сцену. Колесо — масштаб. Правая или средняя кнопка мыши — перемещение вида. Alt при перетаскивании отключает привязку.</p>
<h3>Сохранение</h3><p>Автосохранение хранится только в этом браузере. Скачивайте JSON-проект для переноса и резервной копии. Изображения включаются в файл. Кнопка «Стоп» возвращает исходную сцену.</p><p>Исполняйте собственные или доверенные скрипты. Worker позволяет прервать зависший код, но не является полной защитой от вредоносного JavaScript.</p>`;
