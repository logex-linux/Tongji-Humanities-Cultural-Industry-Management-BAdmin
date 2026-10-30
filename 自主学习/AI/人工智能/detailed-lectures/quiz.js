function checkQuiz(qid, el, isCorrect, wrongMessage = '❌ 不对，看看绿色选项的解释。') {
  var opts = document.getElementById(qid).querySelectorAll('.quiz-opt');
  var fb = document.getElementById(qid + '-fb');
  opts.forEach(function(o) { o.classList.add('disabled'); });
  el.classList.add(isCorrect ? 'correct' : 'wrong');
  fb.textContent = isCorrect ? '✅ 正确！' : wrongMessage;
  fb.className = 'quiz-feedback show ' + (isCorrect ? 'ok' : 'no');
  if (!isCorrect) {
    opts.forEach(function(o) {
      if (o.getAttribute('onclick').includes('true')) o.classList.add('correct');
    });
  }
}

var checkQ = checkQuiz;
var checkQ7 = checkQuiz;

function checkQ2(qid, el, isCorrect) {
  checkQuiz(qid, el, isCorrect, '❌ 不对，看看绿色选项。');
}

function checkQQ(prefix, qid, el, isCorrect) {
  checkQ2(prefix + '-' + qid, el, isCorrect);
}
