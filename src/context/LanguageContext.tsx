import { createContext, useContext, useEffect, useMemo } from "react";

type LanguageCode = "en" | "hi" | "gu" | "mr" | "ta";
export type I18nKey =
  | "nav.dashboard"
  | "nav.expenses"
  | "nav.groups"
  | "nav.budget"
  | "nav.reports"
  | "nav.settings"
  | "layout.signedInAs"
  | "layout.groupInvite"
  | "layout.view"
  | "layout.logout"
  | "page.dashboard.title"
  | "page.dashboard.subtitle"
  | "page.reports.title"
  | "page.reports.subtitle"
  | "page.budget.title"
  | "page.budget.subtitle"
  | "page.groups.title"
  | "page.groups.subtitle"
  | "page.groups.newGroup"
  | "page.expenses.title"
  | "page.expenses.subtitle"
  | "page.settings.title"
  | "page.settings.subtitle";

const messages: Record<LanguageCode, Record<I18nKey, string>> = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.expenses": "Expenses",
    "nav.groups": "Groups",
    "nav.budget": "Budget",
    "nav.reports": "Reports",
    "nav.settings": "Settings",
    "layout.signedInAs": "Signed in as",
    "layout.groupInvite": "You have a group invitation.",
    "layout.view": "View",
    "layout.logout": "Log out",
    "page.dashboard.title": "Dashboard",
    "page.dashboard.subtitle": "Personal spending overview",
    "page.reports.title": "Reports",
    "page.reports.subtitle": "Financial analytics, trends, and exports for your personal activity.",
    "page.budget.title": "Budget",
    "page.budget.subtitle": "Monthly category limits, alerts, rollover, and forecasts.",
    "page.groups.title": "Groups",
    "page.groups.subtitle": "Manage shared groups, members, balances, and settlements.",
    "page.groups.newGroup": "New group",
    "page.expenses.title": "Expenses",
    "page.expenses.subtitle": "Dark, high-signal expense management workspace with local persistence",
    "page.settings.title": "Settings",
    "page.settings.subtitle": "Profile, alerts, appearance, security, and data controls.",
  },
  hi: {
    "nav.dashboard": "डैशबोर्ड",
    "nav.expenses": "खर्च",
    "nav.groups": "समूह",
    "nav.budget": "बजट",
    "nav.reports": "रिपोर्ट्स",
    "nav.settings": "सेटिंग्स",
    "layout.signedInAs": "साइन इन:",
    "layout.groupInvite": "आपके पास समूह निमंत्रण है।",
    "layout.view": "देखें",
    "layout.logout": "लॉग आउट",
    "page.dashboard.title": "डैशबोर्ड",
    "page.dashboard.subtitle": "व्यक्तिगत खर्च का अवलोकन",
    "page.reports.title": "रिपोर्ट्स",
    "page.reports.subtitle": "आपकी व्यक्तिगत गतिविधि के लिए वित्तीय विश्लेषण, ट्रेंड और एक्सपोर्ट।",
    "page.budget.title": "बजट",
    "page.budget.subtitle": "मासिक श्रेणी सीमाएं, अलर्ट, रोलओवर और पूर्वानुमान।",
    "page.groups.title": "समूह",
    "page.groups.subtitle": "साझा समूह, सदस्य, बैलेंस और सेटलमेंट प्रबंधित करें।",
    "page.groups.newGroup": "नया समूह",
    "page.expenses.title": "खर्च",
    "page.expenses.subtitle": "लोकल स्टोरेज के साथ डार्क, हाई-सिग्नल खर्च प्रबंधन कार्यक्षेत्र",
    "page.settings.title": "सेटिंग्स",
    "page.settings.subtitle": "प्रोफाइल, अलर्ट, अपीयरेंस, सुरक्षा और डेटा नियंत्रण।",
  },
  gu: {
    "nav.dashboard": "ડેશબોર્ડ",
    "nav.expenses": "ખર્ચ",
    "nav.groups": "ગ્રૂપ્સ",
    "nav.budget": "બજેટ",
    "nav.reports": "રિપોર્ટ્સ",
    "nav.settings": "સેટિંગ્સ",
    "layout.signedInAs": "સાઇન ઇન:",
    "layout.groupInvite": "તમને ગ્રૂપ આમંત્રણ મળ્યું છે.",
    "layout.view": "જુઓ",
    "layout.logout": "લૉગ આઉટ",
    "page.dashboard.title": "ડેશબોર્ડ",
    "page.dashboard.subtitle": "વ્યક્તિગત ખર્ચની ઝલક",
    "page.reports.title": "રિપોર્ટ્સ",
    "page.reports.subtitle": "તમારી વ્યક્તિગત પ્રવૃત્તિ માટે નાણાકીય વિશ્લેષણ, ટ્રેન્ડ્સ અને એક્સપોર્ટ્સ.",
    "page.budget.title": "બજેટ",
    "page.budget.subtitle": "માસિક કેટેગરી મર્યાદા, એલર્ટ, રોલઓવર અને પૂર્વાનુમાન.",
    "page.groups.title": "ગ્રૂપ્સ",
    "page.groups.subtitle": "શેર કરેલા ગ્રૂપ્સ, સભ્યો, બેલેન્સ અને સેટલમેન્ટ મેનેજ કરો.",
    "page.groups.newGroup": "નવો ગ્રૂપ",
    "page.expenses.title": "ખર્ચ",
    "page.expenses.subtitle": "લોકલ પર્સિસ્ટન્સ સાથે ડાર્ક અને હાઇ-સિગ્નલ ખર્ચ વ્યવસ્થાપન વર્કસ્પેસ",
    "page.settings.title": "સેટિંગ્સ",
    "page.settings.subtitle": "પ્રોફાઇલ, એલર્ટ્સ, દેખાવ, સુરક્ષા અને ડેટા કંટ્રોલ્સ.",
  },
  mr: {
    "nav.dashboard": "डॅशबोर्ड",
    "nav.expenses": "खर्च",
    "nav.groups": "गट",
    "nav.budget": "बजेट",
    "nav.reports": "अहवाल",
    "nav.settings": "सेटिंग्ज",
    "layout.signedInAs": "साइन इन:",
    "layout.groupInvite": "तुमच्याकडे गट आमंत्रण आहे.",
    "layout.view": "पाहा",
    "layout.logout": "लॉग आउट",
    "page.dashboard.title": "डॅशबोर्ड",
    "page.dashboard.subtitle": "वैयक्तिक खर्चाचा आढावा",
    "page.reports.title": "अहवाल",
    "page.reports.subtitle": "तुमच्या वैयक्तिक क्रियाकलापांसाठी आर्थिक विश्लेषण, ट्रेंड्स आणि एक्सपोर्ट्स.",
    "page.budget.title": "बजेट",
    "page.budget.subtitle": "मासिक श्रेणी मर्यादा, अलर्ट्स, रोलओव्हर आणि अंदाज.",
    "page.groups.title": "गट",
    "page.groups.subtitle": "शेअर्ड गट, सदस्य, बॅलन्स आणि सेटलमेंट व्यवस्थापित करा.",
    "page.groups.newGroup": "नवा गट",
    "page.expenses.title": "खर्च",
    "page.expenses.subtitle": "लोकल पर्सिस्टन्ससह डार्क, उच्च-सिग्नल खर्च व्यवस्थापन कार्यक्षेत्र",
    "page.settings.title": "सेटिंग्ज",
    "page.settings.subtitle": "प्रोफाइल, अलर्ट्स, अपिअरन्स, सुरक्षा आणि डेटा नियंत्रण.",
  },
  ta: {
    "nav.dashboard": "டாஷ்போர்டு",
    "nav.expenses": "செலவுகள்",
    "nav.groups": "குழுக்கள்",
    "nav.budget": "பட்ஜெட்",
    "nav.reports": "அறிக்கைகள்",
    "nav.settings": "அமைப்புகள்",
    "layout.signedInAs": "உள்நுழைந்தவர்:",
    "layout.groupInvite": "உங்களுக்கு ஒரு குழு அழைப்பு உள்ளது.",
    "layout.view": "பார்க்க",
    "layout.logout": "வெளியேறு",
    "page.dashboard.title": "டாஷ்போர்டு",
    "page.dashboard.subtitle": "தனிப்பட்ட செலவுகளின் சுருக்கம்",
    "page.reports.title": "அறிக்கைகள்",
    "page.reports.subtitle": "உங்கள் தனிப்பட்ட செயல்பாட்டிற்கான நிதி பகுப்பாய்வு, போக்குகள் மற்றும் ஏற்றுமதி.",
    "page.budget.title": "பட்ஜெட்",
    "page.budget.subtitle": "மாதாந்திர வகை வரம்புகள், எச்சரிக்கைகள், ரோல்ஓவர் மற்றும் முன்னறிவிப்புகள்.",
    "page.groups.title": "குழுக்கள்",
    "page.groups.subtitle": "பகிரப்பட்ட குழுக்கள், உறுப்பினர்கள், இருப்புகள் மற்றும் தீர்வுகளை நிர்வகிக்கவும்.",
    "page.groups.newGroup": "புதிய குழு",
    "page.expenses.title": "செலவுகள்",
    "page.expenses.subtitle": "லோகல் பersistன்ஸுடன் டார்க், உயர்-சிக்னல் செலவு மேலாண்மை பணிமனை",
    "page.settings.title": "அமைப்புகள்",
    "page.settings.subtitle": "சுயவிவரம், எச்சரிக்கைகள், தோற்றம், பாதுகாப்பு மற்றும் தரவு கட்டுப்பாடுகள்.",
  },
};

type Ctx = {
  language: LanguageCode;
  t: (key: I18nKey) => string;
};

const LanguageContext = createContext<Ctx>({
  language: "en",
  t: (key) => messages.en[key],
});

function normalizeLanguage(value?: string): LanguageCode {
  if (value === "hi" || value === "gu" || value === "mr" || value === "ta") return value;
  return "en";
}

export function LanguageProvider({
  language,
  children,
}: {
  language?: string;
  children: React.ReactNode;
}) {
  const lang = normalizeLanguage(language);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<Ctx>(
    () => ({
      language: lang,
      t: (key) => messages[lang][key] ?? messages.en[key],
    }),
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  return useContext(LanguageContext);
}
