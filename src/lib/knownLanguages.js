const knownLanguages = {
  en: {
    label: 'English',
    dir: 'ltr',
    code: 'en',
    default: false,
    spellAs: [
      'english', 'en',
    ],
  },
  ar: {
    label: 'العربية',
    dir: 'rtl',
    code: 'ar',
    default: false,
    spellAs: [
      'arabic', 
      'ar', 
      'ara',
      'العربية',
    ],
  }
};

module.exports = knownLanguages;
