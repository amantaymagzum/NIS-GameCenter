import {lessons} from './course.js';
import {icon} from './icons.js';
import {lessonVisuals} from './lesson-visuals.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function lessonMarkup(index,completed,highlight) {
  const lesson=lessons[index],visual=lessonVisuals[index],done=completed.includes(index);
  return `<div class="course-layout">
    <nav class="course-nav" aria-label="Программа курса">
      <div class="course-nav-heading"><span>ТВОЯ ПРОГРАММА</span><strong>От идеи до игры</strong><small>7 класс · ${lessons.length} занятий по 45 минут</small></div>
      <div class="course-progress-label"><span>Пройдено</span><b>${completed.length} / ${lessons.length}</b></div>
      <progress class="course-progress-bar" value="${completed.length}" max="${lessons.length}" aria-label="Прогресс курса"></progress>
      <div class="course-nav-list">${lessons.map((l,i)=>`<button type="button" data-course-lesson="${i}" class="course-nav-item ${i===index?'current':''} ${completed.includes(i)?'completed':''}" ${i===index?'aria-current="step"':''}><span>${completed.includes(i)?icon('check',13):String(i+1).padStart(2,'0')}</span><span><b>${esc(l.title)}</b><small>${esc(l.module)}</small></span></button>`).join('')}</div>
      <button type="button" id="course-download" class="course-download">${icon('download',13)}Текст курса · Markdown</button>
      <a class="course-download" href="./public/materials/illustrated-course.html" download="NIS-GameCenter-illustrated-course.html">${icon('image',13)}Курс с картинками · HTML</a>
    </nav>
    <article class="lesson-article">
      <div class="lesson-reading-meta"><span class="pill">${icon('book',13)}${esc(lesson.time)}</span><span>${esc(lesson.module)}</span><span class="reading-counter">${index+1} / ${lessons.length}</span></div>
      <p class="lesson-intro">${esc(lesson.subtitle)}</p>
      <figure class="lesson-illustration"><a href="./public/lessons/${visual.file}" target="_blank" rel="noopener" aria-label="Открыть иллюстрацию в полном размере"><img src="./public/lessons/${visual.file}" alt="${esc(visual.alt)}" width="960" height="400" decoding="async"/></a><figcaption>${esc(visual.caption)}<span>Нажми на картинку, чтобы рассмотреть</span></figcaption></figure>
      <section class="learning-goals"><h3>На этом уроке ты научишься</h3><ul>${lesson.goals.map(g=>`<li>${esc(g)}</li>`).join('')}</ul></section>
      <section class="lesson-theory"><span class="learning-eyebrow">01 / РАЗБИРАЕМСЯ</span><div class="theory-cards">${lesson.theory.map((t,i)=>`<div class="theory-card"><span class="theory-card-number">${String(i+1).padStart(2,'0')}</span><h3>${esc(t.title)}</h3><p class="theory-short">${esc(visual.summaries[i])}</p><details class="theory-expanded"><summary>Подробнее ${icon('down',12)}</summary><p>${esc(t.text)}</p></details></div>`).join('')}</div></section>
      <section class="visual-prediction" aria-label="Вопрос по картинке"><span class="learning-eyebrow">ПРЕДСКАЖИ РЕЗУЛЬТАТ</span><h3>${esc(visual.question)}</h3><div class="prediction-options">${visual.options.map((option,i)=>`<button type="button" class="prediction-choice" data-visual-choice="${i}" aria-pressed="false"><span>${String.fromCharCode(65+i)}</span>${esc(option)}</button>`).join('')}</div><p class="prediction-feedback" role="status" hidden></p></section>
      ${lesson.code?`<section class="lesson-example"><span class="learning-eyebrow">ПРИМЕР КОДА</span><p class="example-setup">${esc(lesson.code.setup)}</p><div class="example-code-heading"><span>${icon('code',14)}${esc(lesson.code.name)}</span><button type="button" id="lesson-copy-code">${icon('copy',12)}Скопировать</button></div><pre class="lesson-example-text"><code>${highlight(lesson.code.source)}</code></pre><p class="example-explanation">${esc(lesson.code.explanation)}</p></section>`:''}
      <section class="lesson-practice"><span class="learning-eyebrow">02 / ДЕЛАЕМ</span><div class="lesson-action-flow" aria-label="Как получить результат">${visual.flow.map((step,i)=>`<div><b>${i+1}</b><span>${esc(step)}</span></div>${i<visual.flow.length-1?icon('arrow',18):''}`).join('')}</div><h3>Пошаговая практика</h3><ol class="lesson-steps">${lesson.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></section>
      <div class="lesson-task"><span>ТВОЯ ЗАДАЧА</span><p>${esc(lesson.task)}</p></div>
      <section class="lesson-criteria"><h3>Готово, если…</h3><ul>${lesson.checks.map(c=>`<li>${icon('check',14)}<span>${esc(c)}</span></li>`).join('')}</ul></section>
      <section class="lesson-selfcheck"><span class="learning-eyebrow">03 / ПРОВЕРЯЕМ СЕБЯ</span><h3>Сначала ответь, потом открой подсказку</h3>${lesson.quiz.map(q=>`<details class="quiz-question"><summary>${esc(q.question)}${icon('down',14)}</summary><p>${esc(q.answer)}</p></details>`).join('')}</section>
      <section class="lesson-extra"><div><span>${icon('spark',14)}ЕСЛИ УСПЕЛ РАНЬШЕ</span><p>${esc(lesson.challenge)}</p></div><div><span>${icon('book',14)}ДО СЛЕДУЮЩЕГО УРОКА</span><p>${esc(lesson.homework)}</p></div></section>
      <div class="lesson-bottom-note">Отметка о прохождении сохраняется в текущем проекте. ${done?'Этот урок уже отмечен пройденным.':'Отметь урок после выполнения практики.'}</div>
      <div class="modal-actions lesson-actions"><button id="lesson-back" class="secondary-button" ${index===0?'disabled':''}>Назад</button><button id="lesson-try" class="secondary-button">${icon(lesson.practiceTab==='code'?'code':'scene',14)}К практике</button><button id="lesson-print" class="secondary-button" title="Распечатать материал текущего урока">Печать</button><button id="lesson-done" class="primary-button">${done?(index===lessons.length-1?'Готово':'Следующий урок'):(index===lessons.length-1?'Завершить урок':'Урок пройден')}${icon('check',14)}</button></div>
    </article>
  </div>`;
}

export function courseMarkdown(){
  return '# NIS-GameCenter — курс разработки 2D-игр\n\n7 класс · 10 занятий по 45 минут. JavaScript и компонентная модель.\n\n'+lessons.map((l,i)=>{
    const code=l.code?`\n### Пример: ${l.code.name}\n\n${l.code.setup}\n\n\`\`\`javascript\n${l.code.source}\n\`\`\`\n\n${l.code.explanation}\n`:'';
    return `## Урок ${i+1}. ${l.title}\n\n${l.subtitle}\n\n### Цели\n\n${l.goals.map(g=>'- '+g).join('\n')}\n\n${l.theory.map(t=>`### ${t.title}\n\n${t.text}`).join('\n\n')}\n${code}\n### Практика\n\n${l.steps.map((s,n)=>`${n+1}. ${s}`).join('\n')}\n\n**Задание:** ${l.task}\n\n### Критерии результата\n\n${l.checks.map(c=>'- '+c).join('\n')}\n\n### Самопроверка\n\n${l.quiz.map(q=>`**${q.question}**\n\n${q.answer}`).join('\n\n')}\n\n**Дополнительное задание:** ${l.challenge}\n\n**Домашняя работа:** ${l.homework}\n`;
  }).join('\n---\n\n');
}
