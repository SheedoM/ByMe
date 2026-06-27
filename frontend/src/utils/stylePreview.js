// Builds a deterministic sample post from the structured style settings so new
// users can see, live, how each dial changes their output. The topic is fixed
// (shipping a first feature) so the ONLY thing that varies is the style itself.

const BANKS = {
  en: {
    conversational: {
      opening: 'So we finally shipped the feature last week.',
      beats: [
        "Honestly, it took us three tries to get the onboarding right.",
        'The first version confused pretty much everyone on the team.',
        'What changed everything was just watching one real user click through it.',
      ],
      closing: 'Anyway — small wins still count.',
    },
    educational: {
      opening: "Here's what shipping our first feature taught me about onboarding.",
      beats: [
        'Most users decide in the first 30 seconds whether to stay.',
        'Clear defaults beat clever options almost every time.',
        'Watching one real session is worth a dozen opinions in a meeting.',
      ],
      closing: 'Keep it simple first, then earn the complexity.',
    },
    analytical: {
      opening: 'We shipped the feature, and the data told a clear story.',
      beats: [
        'Activation rose 18% once we cut the setup steps in half.',
        'Drop-off was concentrated on a single confusing screen.',
        'Removing two fields moved the metric more than a week of copy edits.',
      ],
      closing: 'The lesson: measure the friction before you redesign it.',
    },
    personal: {
      opening: 'I almost shelved this feature twice before we shipped it.',
      beats: [
        'The deadline slipped and, honestly, I took it personally.',
        'What pulled me back was remembering why we started.',
        'Seeing the first user actually succeed made the stress worth it.',
      ],
      closing: 'Some wins are quiet. This one was mine.',
    },
    blunt: {
      opening: 'Our first version of the feature was bad. We shipped it anyway, then fixed it.',
      beats: [
        'The onboarding was confusing and the data proved it.',
        'We cut half the steps. No debate, no committee.',
        'It worked.',
      ],
      closing: "Ship, watch, fix. That's the whole job.",
    },
    storytelling: {
      opening: 'Three days before launch, our onboarding broke in front of a customer.',
      beats: [
        'She stared at the screen, then asked what she was supposed to do next.',
        'That silence taught me more than our entire planning doc.',
        'We rebuilt the first screen overnight around that one moment.',
      ],
      closing: 'She came back the next week. That was the ending I wanted.',
    },
  },
  ar: {
    conversational: {
      opening: 'أخيرًا أطلقنا الميزة الأسبوع الماضي.',
      beats: [
        'بصراحة، احتجنا ثلاث محاولات حتى نضبط تجربة البداية.',
        'النسخة الأولى أربكت كل الفريق تقريبًا.',
        'الذي غيّر كل شيء هو مشاهدة مستخدم حقيقي واحد وهو يجرّبها.',
      ],
      closing: 'على أي حال — الانتصارات الصغيرة لها قيمتها.',
    },
    educational: {
      opening: 'هذا ما علّمني إياه إطلاق أول ميزة عن تجربة البداية.',
      beats: [
        'معظم المستخدمين يقررون خلال أول 30 ثانية إن كانوا سيبقون.',
        'الخيارات الافتراضية الواضحة تتفوق على الذكية في أغلب الأحيان.',
        'مشاهدة جلسة حقيقية واحدة تساوي عشرات الآراء في اجتماع.',
      ],
      closing: 'ابدأ بالبساطة، ثم استحق التعقيد لاحقًا.',
    },
    analytical: {
      opening: 'أطلقنا الميزة، والأرقام روت قصة واضحة.',
      beats: [
        'ارتفع التفعيل بنسبة 18% بعد أن قلّصنا خطوات الإعداد إلى النصف.',
        'تركّز التسرّب في شاشة واحدة مربكة.',
        'حذف حقلين حرّك المؤشر أكثر من أسبوع كامل من تعديل النصوص.',
      ],
      closing: 'الدرس: قِس الاحتكاك قبل أن تعيد التصميم.',
    },
    personal: {
      opening: 'كدت أؤجل هذه الميزة مرتين قبل أن نطلقها.',
      beats: [
        'تأخر الموعد النهائي، وبصراحة أخذت الأمر على محمل شخصي.',
        'ما أعادني هو تذكُّر لماذا بدأنا أساسًا.',
        'رؤية أول مستخدم ينجح فعلًا جعلت التوتر يستحق العناء.',
      ],
      closing: 'بعض الانتصارات هادئة. وهذا كان انتصاري.',
    },
    blunt: {
      opening: 'نسختنا الأولى من الميزة كانت سيئة. أطلقناها رغم ذلك، ثم أصلحناها.',
      beats: [
        'تجربة البداية كانت مربكة، والأرقام أثبتت ذلك.',
        'حذفنا نصف الخطوات. بلا نقاش ولا لجان.',
        'ونجح الأمر.',
      ],
      closing: 'أطلق، راقب، أصلح. هذا هو العمل كله.',
    },
    storytelling: {
      opening: 'قبل الإطلاق بثلاثة أيام، تعطّلت تجربة البداية أمام عميلة.',
      beats: [
        'حدّقت في الشاشة، ثم سألت ماذا يُفترض أن تفعل تاليًا.',
        'ذلك الصمت علّمني أكثر من كل مستند التخطيط لدينا.',
        'أعدنا بناء الشاشة الأولى طوال الليل حول تلك اللحظة وحدها.',
      ],
      closing: 'عادت في الأسبوع التالي. تلك هي النهاية التي أردتها.',
    },
  },
}

const EMOJIS = ['🚀', '📈', '💡', '🙌', '🔥']

// High formality reads more polished: expand casual contractions/fillers.
const FORMALIZE = [
  [/Here's/g, 'Here is'],
  [/That's/g, 'That is'],
  [/won't/g, 'will not'],
  [/can't/g, 'cannot'],
  [/didn't/g, 'did not'],
  [/it's/g, 'it is'],
  [/we're/g, 'we are'],
  [/Honestly, /g, ''],
  [/, honestly,/g, ''],
  [/Anyway — /g, 'In closing, '],
  [/So we finally/g, 'We recently'],
  [/pretty much /g, ''],
]

function applyFormality(text, level) {
  if (level >= 8) {
    return FORMALIZE.reduce((acc, [re, rep]) => acc.replace(re, rep), text)
  }
  return text
}

function beatCount(avgLength) {
  if (avgLength <= 90) return 1
  if (avgLength <= 170) return 2
  return 3
}

function addEmoji(lines, usage) {
  if (usage === 'none' || !lines.length) return lines
  const pick = (i) => EMOJIS[i % EMOJIS.length]
  if (usage === 'minimal') {
    const out = [...lines]
    out[out.length - 1] = `${out[out.length - 1]} ${pick(0)}`
    return out
  }
  if (usage === 'moderate') {
    return lines.map((l, i) => (i % 2 === 0 ? `${l} ${pick(i)}` : l))
  }
  // heavy
  return lines.map((l, i) => `${l} ${pick(i)}`)
}

// Joins a list of body sentences into paragraphs according to paragraph_length.
function groupParagraphs(beats, paragraphLength) {
  if (paragraphLength === 'short') return beats // one sentence per block
  if (paragraphLength === 'long') return [beats.join(' ')] // all in one block
  // medium: pair them up
  const out = []
  for (let i = 0; i < beats.length; i += 2) {
    out.push(beats.slice(i, i + 2).join(' '))
  }
  return out
}

/**
 * @returns {string[]} blocks — render each as its own paragraph (or bullet).
 */
export function buildPreview(form, locale = 'en') {
  const lang = BANKS[locale] ? locale : 'en'
  const bank = BANKS[lang][form.tone] || BANKS[lang].conversational
  const level = Number(form.formality_level) || 5

  const opening = applyFormality(bank.opening, level)
  const closing = applyFormality(bank.closing, level)
  const beats = bank.beats
    .slice(0, beatCount(Number(form.avg_post_length) || 130))
    .map((b) => applyFormality(b, level))

  let blocks
  if (form.structure_preference === 'bullets') {
    blocks = [opening, ...beats.map((b) => `• ${b}`), closing]
  } else if (form.structure_preference === 'mixed') {
    blocks = [opening, ...beats.map((b) => `• ${b}`), '', closing]
  } else {
    // prose
    blocks = [opening, ...groupParagraphs(beats, form.paragraph_length), closing]
  }

  return addEmoji(blocks.filter((b) => b !== undefined), form.emoji_usage)
}
