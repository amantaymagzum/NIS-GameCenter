// Lesson indices stay unchanged: existing project progress remains compatible.
export const chapters=[
  {id:'foundations',number:1,title:'Основы создания игр',start:0,end:10,
    description:'От знакомства со сценой до первого самостоятельного проекта.'},
  {id:'development',number:2,title:'Развитие и выпуск игры',start:10,end:16,
    description:'Продолжение для тех, кто прошёл первые десять уроков: таймеры, жизни, защита от урона, звук, визуальные эффекты и выпуск HTML-игры.'},
  {id:'animation',number:3,title:'Анимация и игровые эффекты',start:16,end:19,
    description:'Оживляем персонажа: рисуем кости, сохраняем ключевые позы, переключаем клипы и добавляем частицы с мягкой встряской камеры.'}
];
export const chapterForLesson=index=>chapters.find(c=>index>=c.start&&index<c.end);
export const chapterLabel=chapter=>`Глава ${chapter.number}. ${chapter.title}`;
