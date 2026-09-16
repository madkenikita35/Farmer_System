// i18n/translations.js
// -----------------------------------------------------------------------
// Every word the FARMER side of the app shows, in every language we
// support. ("i18n" is the standard short name for internationalisation -
// an "i", 18 letters, then an "n".)
//
// WHY IS THIS ITS OWN FILE?
// It used to live inside LanguageContext.jsx. With two languages that was
// fine; with eleven it buried the actual logic under 700 lines of
// vocabulary. Now LanguageContext.jsx holds the small amount of CODE, and
// this file holds the WORDS. You'll almost always be editing this one.
//
// HOW IT WORKS
//   1. Every piece of text has a short key, e.g. "nav_home".
//   2. Each language object gives that key its own translation.
//   3. Components call t("nav_home") and get the right one back.
//
// HOW TO ADD A NEW PIECE OF TEXT:
//   Add your key to `en` first, then to each other language. If you miss
//   one, nothing breaks - t() quietly falls back to English for that key
//   (see LanguageContext.jsx), so a half-finished translation still gives
//   a usable page rather than a blank one.
//
// HOW TO ADD A WHOLE NEW LANGUAGE:
//   1. Add an entry to LANGUAGES below (code + how the language writes
//      its own name).
//   2. Add a matching object to `translations` with the same keys.
//   That's it - the dropdown in the navbar builds itself from LANGUAGES.
//
// NOTE: the ADMIN side is intentionally English-only and does not use
// this file. See the comment in LanguageContext.jsx for why.
// -----------------------------------------------------------------------

// The languages offered in the navbar dropdown, in the order shown.
// `nativeLabel` is the language's name written in its OWN script - a
// Tamil-speaking farmer looks for "தமிழ்", not the word "Tamil".
export const LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી" },
  { code: "pa", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", nativeLabel: "മലയാളം" },
  { code: "or", label: "Odia", nativeLabel: "ଓଡ଼ିଆ" },
];

// English is the default and the fallback for any missing key.
export const DEFAULT_LANGUAGE = "en";

export const translations = {
  // =====================================================================
  // ENGLISH  -  the master list. Add new keys HERE first.
  // =====================================================================
  en: {
    nav_home: "Home",
    nav_upload: "Upload Receipt",
    nav_check_rates: "Check Rates",
    nav_nearby: "Near Me",
    nav_mandis: "Mandis",
    nav_dashboard: "Dashboard",
    nav_login: "Log In",
    nav_signup: "Sign Up",
    nav_logout: "Log Out",
    nav_hello: "Hi",
    select_language: "Language",

    hero_badge: "Trusted by farmers across India",
    hero_title: "Know the real price of your crop",
    hero_subtitle:
      "We combine TWO sources of price data: the official government mandi rates, AND what other farmers using this app actually got paid - so you always see the official number alongside real, on-the-ground evidence.",
    hero_cta_primary: "Check Mandi Rates",
    hero_cta_secondary: "Upload a Receipt",
    hero_slide_1_caption: "Government mandi rates for 50+ crops",
    hero_slide_2_caption: "See what nearby farmers actually got paid",
    hero_slide_3_caption: "Upload your receipt in seconds, from any phone",
    hero_slide_4_caption: "Sell with confidence, not guesswork",

    stats_farmers: "Farmers Helped",
    stats_receipts: "Receipts Analysed",
    stats_crops: "Crops Tracked",
    stats_mandis: "Mandis Covered",

    option_upload_title: "Upload Your Receipt",
    option_upload_text:
      "Already sold your crop? Upload the receipt. We'll read it, tell you if you got a fair price, and your data helps OTHER farmers make better decisions too.",
    option_upload_link: "Upload a Receipt",
    option_check_title: "Check Rates Before Selling",
    option_check_text:
      "Not sold yet? Search any crop to see the government rate AND what nearby farmers reported getting - so you can choose the best mandi and the best day.",
    option_check_link: "Check Mandi Rates",
    view_dashboard: "Or view the full Dashboard",

    crops_title: "Crops we track",
    crops_subtitle: "Live government rates and farmer-reported prices for each one",
    gallery_title: "From the farm to the mandi",
    gallery_subtitle: "Real prices at every step of the journey",

    how_it_works_title: "How it works",
    how_it_works_subtitle: "Three simple steps to a fair price",
    step1_title: "1. Upload or Search",
    step1_text: "Upload a receipt photo, or just search a crop name to check rates.",
    step2_title: "2. Two Data Sources",
    step2_text: "We pull the official government mandi rate AND what other farmers reported.",
    step3_title: "3. Decide with Confidence",
    step3_text: "Clear graphs and a plain verdict - Fair Price, Underpaid, or Overpaid.",

    testimonials_title: "What farmers are saying",
    testimonial_1_text:
      "I found out I was getting paid 15% less than the government rate for my onions. Next time I chose a different mandi and earned more.",
    testimonial_1_name: "Ramesh Patil",
    testimonial_1_role: "Onion Farmer, Nashik",
    testimonial_2_text:
      "Very simple to use. I just take a photo of my receipt and it tells me if the price was fair. My father uses it too.",
    testimonial_2_name: "Sunita Jadhav",
    testimonial_2_role: "Cotton Farmer, Jalgaon",
    testimonial_3_text:
      "Before selling my wheat, I check the app to see which mandi is paying better this week. It has saved me real money.",
    testimonial_3_name: "Vikram More",
    testimonial_3_role: "Wheat Farmer, Pune",

    footer_tagline: "Fair prices for every farmer, backed by real data.",
    footer_links_title: "Quick Links",
    footer_contact_title: "Contact Us",
    footer_rights: "All rights reserved.",

    login_title: "Welcome back",
    login_subtitle: "Log in to track your receipts and saved crops.",
    signup_title: "Create your account",
    signup_subtitle: "Join thousands of farmers getting fair prices.",
    label_name: "Full Name",
    label_email: "Email Address",
    label_password: "Password",
    label_confirm_password: "Confirm Password",
    btn_login: "Log In",
    btn_signup: "Create Account",
    have_account: "Already have an account?",
    no_account: "Don't have an account?",
  },

  // =====================================================================
  // हिन्दी  -  HINDI
  // =====================================================================
  hi: {
    nav_home: "होम",
    nav_upload: "रसीद अपलोड करें",
    nav_check_rates: "भाव देखें",
    nav_nearby: "मेरे पास",
    nav_mandis: "मंडियां",
    nav_dashboard: "डैशबोर्ड",
    nav_login: "लॉग इन",
    nav_signup: "साइन अप",
    nav_logout: "लॉग आउट",
    nav_hello: "नमस्ते",
    select_language: "भाषा",

    hero_badge: "पूरे भारत के किसानों का भरोसा",
    hero_title: "अपनी फसल का असली दाम जानें",
    hero_subtitle:
      "हम दो स्रोतों से भाव जोड़ते हैं: सरकारी मंडी दरें, और इस ऐप का उपयोग करने वाले दूसरे किसानों को वास्तव में मिला दाम - ताकि आपको आधिकारिक आंकड़े के साथ ज़मीनी सच्चाई भी दिखे।",
    hero_cta_primary: "मंडी भाव देखें",
    hero_cta_secondary: "रसीद अपलोड करें",
    hero_slide_1_caption: "50+ फसलों के सरकारी मंडी भाव",
    hero_slide_2_caption: "देखें आसपास के किसानों को कितना मिला",
    hero_slide_3_caption: "किसी भी फोन से सेकंडों में रसीद अपलोड करें",
    hero_slide_4_caption: "अंदाज़े से नहीं, भरोसे के साथ बेचें",

    stats_farmers: "किसानों की मदद",
    stats_receipts: "जांची गई रसीदें",
    stats_crops: "दर्ज फसलें",
    stats_mandis: "शामिल मंडियां",

    option_upload_title: "अपनी रसीद अपलोड करें",
    option_upload_text:
      "फसल बेच दी है? रसीद अपलोड करें। हम उसे पढ़ेंगे और बताएंगे कि दाम सही मिला या नहीं - और आपका डेटा दूसरे किसानों की भी मदद करेगा।",
    option_upload_link: "रसीद अपलोड करें",
    option_check_title: "बेचने से पहले भाव देखें",
    option_check_text:
      "अभी बेचा नहीं? कोई भी फसल खोजें और सरकारी दर के साथ आसपास के किसानों को मिला दाम देखें - ताकि आप सही मंडी और सही दिन चुन सकें।",
    option_check_link: "मंडी भाव देखें",
    view_dashboard: "या पूरा डैशबोर्ड देखें",

    crops_title: "हम इन फसलों पर नज़र रखते हैं",
    crops_subtitle: "हर फसल के लिए सरकारी दर और किसानों के बताए दाम",
    gallery_title: "खेत से मंडी तक",
    gallery_subtitle: "हर कदम पर असली भाव",

    how_it_works_title: "यह कैसे काम करता है",
    how_it_works_subtitle: "सही दाम के लिए तीन आसान कदम",
    step1_title: "1. अपलोड करें या खोजें",
    step1_text: "रसीद की फोटो अपलोड करें, या भाव देखने के लिए बस फसल का नाम खोजें।",
    step2_title: "2. दो डेटा स्रोत",
    step2_text: "हम सरकारी मंडी दर और दूसरे किसानों के बताए दाम, दोनों लाते हैं।",
    step3_title: "3. भरोसे के साथ फैसला करें",
    step3_text: "साफ ग्राफ और सीधा नतीजा - सही दाम, कम दाम, या ज़्यादा दाम।",

    testimonials_title: "किसान क्या कहते हैं",
    testimonial_1_text:
      "मुझे पता चला कि प्याज़ के लिए मुझे सरकारी दर से 15% कम मिल रहा था। अगली बार मैंने दूसरी मंडी चुनी और ज़्यादा कमाया।",
    testimonial_1_name: "रमेश पाटिल",
    testimonial_1_role: "प्याज़ किसान, नासिक",
    testimonial_2_text:
      "इस्तेमाल करना बहुत आसान है। मैं बस रसीद की फोटो लेता हूं और यह बता देता है कि दाम सही था या नहीं। मेरे पिताजी भी इसे इस्तेमाल करते हैं।",
    testimonial_2_name: "सुनीता जाधव",
    testimonial_2_role: "कपास किसान, जलगांव",
    testimonial_3_text:
      "गेहूं बेचने से पहले मैं ऐप में देखता हूं कि इस हफ्ते कौन सी मंडी बेहतर दाम दे रही है। इससे मेरे असली पैसे बचे हैं।",
    testimonial_3_name: "विक्रम मोरे",
    testimonial_3_role: "गेहूं किसान, पुणे",

    footer_tagline: "हर किसान के लिए सही दाम, असली आंकड़ों पर आधारित।",
    footer_links_title: "त्वरित लिंक",
    footer_contact_title: "संपर्क करें",
    footer_rights: "सर्वाधिकार सुरक्षित।",

    login_title: "वापस स्वागत है",
    login_subtitle: "अपनी रसीदें और फसलें देखने के लिए लॉग इन करें।",
    signup_title: "अपना खाता बनाएं",
    signup_subtitle: "सही दाम पाने वाले हज़ारों किसानों से जुड़ें।",
    label_name: "पूरा नाम",
    label_email: "ईमेल पता",
    label_password: "पासवर्ड",
    label_confirm_password: "पासवर्ड की पुष्टि करें",
    btn_login: "लॉग इन",
    btn_signup: "खाता बनाएं",
    have_account: "पहले से खाता है?",
    no_account: "खाता नहीं है?",
  },

  // =====================================================================
  // मराठी  -  MARATHI
  // =====================================================================
  mr: {
    nav_home: "मुख्यपृष्ठ",
    nav_upload: "पावती अपलोड करा",
    nav_check_rates: "दर तपासा",
    nav_nearby: "माझ्याजवळ",
    nav_mandis: "मंडई",
    nav_dashboard: "डॅशबोर्ड",
    nav_login: "लॉग इन",
    nav_signup: "साइन अप",
    nav_logout: "लॉग आउट",
    nav_hello: "नमस्कार",
    select_language: "भाषा",

    hero_badge: "संपूर्ण भारतातील शेतकऱ्यांचा विश्वास",
    hero_title: "तुमच्या पिकाची खरी किंमत जाणून घ्या",
    hero_subtitle:
      "आम्ही दोन स्रोतांतून दर एकत्र करतो: अधिकृत सरकारी मंडई दर, आणि हे अ‍ॅप वापरणाऱ्या इतर शेतकऱ्यांना प्रत्यक्षात मिळालेला भाव - जेणेकरून अधिकृत आकड्यासोबत प्रत्यक्ष पुरावाही दिसेल.",
    hero_cta_primary: "मंडई दर तपासा",
    hero_cta_secondary: "पावती अपलोड करा",
    hero_slide_1_caption: "50+ पिकांचे सरकारी मंडई दर",
    hero_slide_2_caption: "जवळच्या शेतकऱ्यांना किती मिळाले ते पहा",
    hero_slide_3_caption: "कोणत्याही फोनवरून काही सेकंदात पावती अपलोड करा",
    hero_slide_4_caption: "अंदाजाने नव्हे, आत्मविश्वासाने विका",

    stats_farmers: "मदत झालेले शेतकरी",
    stats_receipts: "तपासलेल्या पावत्या",
    stats_crops: "नोंदवलेली पिके",
    stats_mandis: "समाविष्ट मंडई",

    option_upload_title: "तुमची पावती अपलोड करा",
    option_upload_text:
      "पीक विकले आहे का? पावती अपलोड करा. आम्ही ती वाचू आणि योग्य भाव मिळाला का ते सांगू - आणि तुमचा डेटा इतर शेतकऱ्यांनाही मदत करेल.",
    option_upload_link: "पावती अपलोड करा",
    option_check_title: "विक्रीपूर्वी दर तपासा",
    option_check_text:
      "अजून विकले नाही? कोणतेही पीक शोधा आणि सरकारी दरासोबत जवळच्या शेतकऱ्यांना मिळालेला भाव पहा - म्हणजे तुम्ही योग्य मंडई आणि योग्य दिवस निवडू शकाल.",
    option_check_link: "मंडई दर तपासा",
    view_dashboard: "किंवा संपूर्ण डॅशबोर्ड पहा",

    crops_title: "आम्ही या पिकांवर लक्ष ठेवतो",
    crops_subtitle: "प्रत्येक पिकासाठी सरकारी दर आणि शेतकऱ्यांनी सांगितलेला भाव",
    gallery_title: "शेतापासून मंडईपर्यंत",
    gallery_subtitle: "प्रत्येक टप्प्यावर खरे दर",

    how_it_works_title: "हे कसे कार्य करते",
    how_it_works_subtitle: "योग्य भावासाठी तीन सोप्या पायऱ्या",
    step1_title: "1. अपलोड करा किंवा शोधा",
    step1_text: "पावतीचा फोटो अपलोड करा, किंवा दर पाहण्यासाठी फक्त पिकाचे नाव शोधा.",
    step2_title: "2. दोन डेटा स्रोत",
    step2_text: "आम्ही अधिकृत सरकारी मंडई दर आणि इतर शेतकऱ्यांनी सांगितलेला भाव, दोन्ही आणतो.",
    step3_title: "3. आत्मविश्वासाने निर्णय घ्या",
    step3_text: "स्पष्ट आलेख आणि सरळ निकाल - योग्य भाव, कमी भाव, किंवा जास्त भाव.",

    testimonials_title: "शेतकरी काय म्हणतात",
    testimonial_1_text:
      "मला कळले की कांद्यासाठी मला सरकारी दरापेक्षा 15% कमी मिळत होते. पुढच्या वेळी मी दुसरी मंडई निवडली आणि जास्त कमावले.",
    testimonial_1_name: "रमेश पाटील",
    testimonial_1_role: "कांदा उत्पादक, नाशिक",
    testimonial_2_text:
      "वापरायला खूप सोपे आहे. मी फक्त पावतीचा फोटो काढतो आणि ते सांगते की भाव योग्य होता का. माझे वडीलही हे वापरतात.",
    testimonial_2_name: "सुनीता जाधव",
    testimonial_2_role: "कापूस उत्पादक, जळगाव",
    testimonial_3_text:
      "गहू विकण्यापूर्वी मी अ‍ॅपमध्ये पाहतो की या आठवड्यात कोणती मंडई चांगला भाव देत आहे. यामुळे माझे खरे पैसे वाचले आहेत.",
    testimonial_3_name: "विक्रम मोरे",
    testimonial_3_role: "गहू उत्पादक, पुणे",

    footer_tagline: "प्रत्येक शेतकऱ्यासाठी योग्य भाव, खऱ्या डेटावर आधारित.",
    footer_links_title: "जलद दुवे",
    footer_contact_title: "संपर्क करा",
    footer_rights: "सर्व हक्क राखीव.",

    login_title: "पुन्हा स्वागत आहे",
    login_subtitle: "तुमच्या पावत्या आणि पिके पाहण्यासाठी लॉग इन करा.",
    signup_title: "तुमचे खाते तयार करा",
    signup_subtitle: "योग्य भाव मिळवणाऱ्या हजारो शेतकऱ्यांमध्ये सामील व्हा.",
    label_name: "पूर्ण नाव",
    label_email: "ईमेल पत्ता",
    label_password: "पासवर्ड",
    label_confirm_password: "पासवर्डची पुष्टी करा",
    btn_login: "लॉग इन",
    btn_signup: "खाते तयार करा",
    have_account: "आधीच खाते आहे का?",
    no_account: "खाते नाही का?",
  },

  // =====================================================================
  // ગુજરાતી  -  GUJARATI
  // =====================================================================
  gu: {
    nav_home: "હોમ",
    nav_upload: "રસીદ અપલોડ કરો",
    nav_check_rates: "ભાવ જુઓ",
    nav_nearby: "મારી પાસે",
    nav_mandis: "મંડીઓ",
    nav_dashboard: "ડેશબોર્ડ",
    nav_login: "લોગ ઇન",
    nav_signup: "સાઇન અપ",
    nav_logout: "લોગ આઉટ",
    nav_hello: "નમસ્તે",
    select_language: "ભાષા",

    hero_badge: "સમગ્ર ભારતના ખેડૂતોનો વિશ્વાસ",
    hero_title: "તમારા પાકની સાચી કિંમત જાણો",
    hero_subtitle:
      "અમે બે સ્રોતમાંથી ભાવ જોડીએ છીએ: સત્તાવાર સરકારી મંડી દર, અને આ એપ વાપરતા બીજા ખેડૂતોને ખરેખર મળેલો ભાવ - જેથી તમને સત્તાવાર આંકડા સાથે જમીની સચ્ચાઈ પણ દેખાય.",
    hero_cta_primary: "મંડી ભાવ જુઓ",
    hero_cta_secondary: "રસીદ અપલોડ કરો",
    hero_slide_1_caption: "50+ પાકના સરકારી મંડી ભાવ",
    hero_slide_2_caption: "નજીકના ખેડૂતોને કેટલું મળ્યું તે જુઓ",
    hero_slide_3_caption: "કોઈપણ ફોનથી સેકન્ડોમાં રસીદ અપલોડ કરો",
    hero_slide_4_caption: "અંદાજથી નહીં, વિશ્વાસથી વેચો",

    stats_farmers: "મદદ મળેલા ખેડૂતો",
    stats_receipts: "તપાસેલી રસીદો",
    stats_crops: "નોંધાયેલા પાક",
    stats_mandis: "સમાવિષ્ટ મંડીઓ",

    option_upload_title: "તમારી રસીદ અપલોડ કરો",
    option_upload_text:
      "પાક વેચી દીધો છે? રસીદ અપલોડ કરો. અમે તે વાંચીશું અને કહીશું કે ભાવ યોગ્ય મળ્યો કે નહીં - અને તમારો ડેટા બીજા ખેડૂતોને પણ મદદ કરશે.",
    option_upload_link: "રસીદ અપલોડ કરો",
    option_check_title: "વેચતા પહેલાં ભાવ જુઓ",
    option_check_text:
      "હજી વેચ્યું નથી? કોઈપણ પાક શોધો અને સરકારી દર સાથે નજીકના ખેડૂતોને મળેલો ભાવ જુઓ - જેથી તમે યોગ્ય મંડી અને યોગ્ય દિવસ પસંદ કરી શકો.",
    option_check_link: "મંડી ભાવ જુઓ",
    view_dashboard: "અથવા આખું ડેશબોર્ડ જુઓ",

    crops_title: "અમે આ પાક પર નજર રાખીએ છીએ",
    crops_subtitle: "દરેક પાક માટે સરકારી દર અને ખેડૂતોએ જણાવેલા ભાવ",
    gallery_title: "ખેતરથી મંડી સુધી",
    gallery_subtitle: "દરેક પગલે સાચા ભાવ",

    how_it_works_title: "આ કેવી રીતે કામ કરે છે",
    how_it_works_subtitle: "યોગ્ય ભાવ માટે ત્રણ સરળ પગલાં",
    step1_title: "1. અપલોડ કરો અથવા શોધો",
    step1_text: "રસીદનો ફોટો અપલોડ કરો, અથવા ભાવ જોવા માટે ફક્ત પાકનું નામ શોધો.",
    step2_title: "2. બે ડેટા સ્રોત",
    step2_text: "અમે સત્તાવાર સરકારી મંડી દર અને બીજા ખેડૂતોએ જણાવેલા ભાવ, બંને લાવીએ છીએ.",
    step3_title: "3. વિશ્વાસથી નિર્ણય લો",
    step3_text: "સ્પષ્ટ ગ્રાફ અને સીધું પરિણામ - યોગ્ય ભાવ, ઓછો ભાવ, કે વધુ ભાવ.",

    testimonials_title: "ખેડૂતો શું કહે છે",
    testimonial_1_text:
      "મને ખબર પડી કે ડુંગળી માટે મને સરકારી દર કરતાં 15% ઓછું મળતું હતું. બીજી વખતે મેં અલગ મંડી પસંદ કરી અને વધુ કમાયો.",
    testimonial_1_name: "રમેશ પાટીલ",
    testimonial_1_role: "ડુંગળી ખેડૂત, નાશિક",
    testimonial_2_text:
      "વાપરવામાં ખૂબ સરળ છે. હું ફક્ત રસીદનો ફોટો પાડું છું અને તે કહે છે કે ભાવ યોગ્ય હતો કે નહીં. મારા પિતા પણ આ વાપરે છે.",
    testimonial_2_name: "સુનીતા જાધવ",
    testimonial_2_role: "કપાસ ખેડૂત, જલગાંવ",
    testimonial_3_text:
      "ઘઉં વેચતા પહેલાં હું એપમાં જોઉં છું કે આ અઠવાડિયે કઈ મંડી સારો ભાવ આપે છે. તેનાથી મારા સાચા પૈસા બચ્યા છે.",
    testimonial_3_name: "વિક્રમ મોરે",
    testimonial_3_role: "ઘઉં ખેડૂત, પુણે",

    footer_tagline: "દરેક ખેડૂત માટે યોગ્ય ભાવ, સાચા ડેટા પર આધારિત.",
    footer_links_title: "ઝડપી લિંક",
    footer_contact_title: "સંપર્ક કરો",
    footer_rights: "સર્વ હક્ક સુરક્ષિત.",

    login_title: "ફરી સ્વાગત છે",
    login_subtitle: "તમારી રસીદો અને પાક જોવા માટે લોગ ઇન કરો.",
    signup_title: "તમારું ખાતું બનાવો",
    signup_subtitle: "યોગ્ય ભાવ મેળવતા હજારો ખેડૂતો સાથે જોડાઓ.",
    label_name: "પૂરું નામ",
    label_email: "ઈમેલ સરનામું",
    label_password: "પાસવર્ડ",
    label_confirm_password: "પાસવર્ડની પુષ્ટિ કરો",
    btn_login: "લોગ ઇન",
    btn_signup: "ખાતું બનાવો",
    have_account: "પહેલેથી ખાતું છે?",
    no_account: "ખાતું નથી?",
  },

  // =====================================================================
  // ਪੰਜਾਬੀ  -  PUNJABI
  // =====================================================================
  pa: {
    nav_home: "ਹੋਮ",
    nav_upload: "ਰਸੀਦ ਅਪਲੋਡ ਕਰੋ",
    nav_check_rates: "ਭਾਅ ਵੇਖੋ",
    nav_nearby: "ਮੇਰੇ ਨੇੜੇ",
    nav_mandis: "ਮੰਡੀਆਂ",
    nav_dashboard: "ਡੈਸ਼ਬੋਰਡ",
    nav_login: "ਲਾਗ ਇਨ",
    nav_signup: "ਸਾਈਨ ਅੱਪ",
    nav_logout: "ਲਾਗ ਆਊਟ",
    nav_hello: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ",
    select_language: "ਭਾਸ਼ਾ",

    hero_badge: "ਪੂਰੇ ਭਾਰਤ ਦੇ ਕਿਸਾਨਾਂ ਦਾ ਭਰੋਸਾ",
    hero_title: "ਆਪਣੀ ਫ਼ਸਲ ਦਾ ਅਸਲ ਭਾਅ ਜਾਣੋ",
    hero_subtitle:
      "ਅਸੀਂ ਦੋ ਸਰੋਤਾਂ ਤੋਂ ਭਾਅ ਜੋੜਦੇ ਹਾਂ: ਸਰਕਾਰੀ ਮੰਡੀ ਰੇਟ, ਅਤੇ ਇਸ ਐਪ ਨੂੰ ਵਰਤਣ ਵਾਲੇ ਹੋਰ ਕਿਸਾਨਾਂ ਨੂੰ ਅਸਲ ਵਿੱਚ ਮਿਲਿਆ ਭਾਅ - ਤਾਂ ਜੋ ਤੁਹਾਨੂੰ ਸਰਕਾਰੀ ਅੰਕੜੇ ਦੇ ਨਾਲ ਜ਼ਮੀਨੀ ਸੱਚਾਈ ਵੀ ਦਿਖੇ।",
    hero_cta_primary: "ਮੰਡੀ ਭਾਅ ਵੇਖੋ",
    hero_cta_secondary: "ਰਸੀਦ ਅਪਲੋਡ ਕਰੋ",
    hero_slide_1_caption: "50+ ਫ਼ਸਲਾਂ ਦੇ ਸਰਕਾਰੀ ਮੰਡੀ ਭਾਅ",
    hero_slide_2_caption: "ਵੇਖੋ ਨੇੜਲੇ ਕਿਸਾਨਾਂ ਨੂੰ ਕਿੰਨਾ ਮਿਲਿਆ",
    hero_slide_3_caption: "ਕਿਸੇ ਵੀ ਫ਼ੋਨ ਤੋਂ ਸਕਿੰਟਾਂ ਵਿੱਚ ਰਸੀਦ ਅਪਲੋਡ ਕਰੋ",
    hero_slide_4_caption: "ਅੰਦਾਜ਼ੇ ਨਾਲ ਨਹੀਂ, ਭਰੋਸੇ ਨਾਲ ਵੇਚੋ",

    stats_farmers: "ਮਦਦ ਮਿਲੇ ਕਿਸਾਨ",
    stats_receipts: "ਜਾਂਚੀਆਂ ਰਸੀਦਾਂ",
    stats_crops: "ਦਰਜ ਫ਼ਸਲਾਂ",
    stats_mandis: "ਸ਼ਾਮਲ ਮੰਡੀਆਂ",

    option_upload_title: "ਆਪਣੀ ਰਸੀਦ ਅਪਲੋਡ ਕਰੋ",
    option_upload_text:
      "ਫ਼ਸਲ ਵੇਚ ਦਿੱਤੀ ਹੈ? ਰਸੀਦ ਅਪਲੋਡ ਕਰੋ। ਅਸੀਂ ਇਸਨੂੰ ਪੜ੍ਹਾਂਗੇ ਅਤੇ ਦੱਸਾਂਗੇ ਕਿ ਭਾਅ ਸਹੀ ਮਿਲਿਆ ਜਾਂ ਨਹੀਂ - ਅਤੇ ਤੁਹਾਡਾ ਡਾਟਾ ਹੋਰ ਕਿਸਾਨਾਂ ਦੀ ਵੀ ਮਦਦ ਕਰੇਗਾ।",
    option_upload_link: "ਰਸੀਦ ਅਪਲੋਡ ਕਰੋ",
    option_check_title: "ਵੇਚਣ ਤੋਂ ਪਹਿਲਾਂ ਭਾਅ ਵੇਖੋ",
    option_check_text:
      "ਅਜੇ ਨਹੀਂ ਵੇਚਿਆ? ਕੋਈ ਵੀ ਫ਼ਸਲ ਲੱਭੋ ਅਤੇ ਸਰਕਾਰੀ ਰੇਟ ਦੇ ਨਾਲ ਨੇੜਲੇ ਕਿਸਾਨਾਂ ਨੂੰ ਮਿਲਿਆ ਭਾਅ ਵੇਖੋ - ਤਾਂ ਜੋ ਤੁਸੀਂ ਸਹੀ ਮੰਡੀ ਅਤੇ ਸਹੀ ਦਿਨ ਚੁਣ ਸਕੋ।",
    option_check_link: "ਮੰਡੀ ਭਾਅ ਵੇਖੋ",
    view_dashboard: "ਜਾਂ ਪੂਰਾ ਡੈਸ਼ਬੋਰਡ ਵੇਖੋ",

    crops_title: "ਅਸੀਂ ਇਹਨਾਂ ਫ਼ਸਲਾਂ 'ਤੇ ਨਜ਼ਰ ਰੱਖਦੇ ਹਾਂ",
    crops_subtitle: "ਹਰ ਫ਼ਸਲ ਲਈ ਸਰਕਾਰੀ ਰੇਟ ਅਤੇ ਕਿਸਾਨਾਂ ਦੇ ਦੱਸੇ ਭਾਅ",
    gallery_title: "ਖੇਤ ਤੋਂ ਮੰਡੀ ਤੱਕ",
    gallery_subtitle: "ਹਰ ਕਦਮ 'ਤੇ ਅਸਲ ਭਾਅ",

    how_it_works_title: "ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ",
    how_it_works_subtitle: "ਸਹੀ ਭਾਅ ਲਈ ਤਿੰਨ ਸੌਖੇ ਕਦਮ",
    step1_title: "1. ਅਪਲੋਡ ਕਰੋ ਜਾਂ ਲੱਭੋ",
    step1_text: "ਰਸੀਦ ਦੀ ਫ਼ੋਟੋ ਅਪਲੋਡ ਕਰੋ, ਜਾਂ ਭਾਅ ਵੇਖਣ ਲਈ ਸਿਰਫ਼ ਫ਼ਸਲ ਦਾ ਨਾਮ ਲੱਭੋ।",
    step2_title: "2. ਦੋ ਡਾਟਾ ਸਰੋਤ",
    step2_text: "ਅਸੀਂ ਸਰਕਾਰੀ ਮੰਡੀ ਰੇਟ ਅਤੇ ਹੋਰ ਕਿਸਾਨਾਂ ਦੇ ਦੱਸੇ ਭਾਅ, ਦੋਵੇਂ ਲਿਆਉਂਦੇ ਹਾਂ।",
    step3_title: "3. ਭਰੋਸੇ ਨਾਲ ਫ਼ੈਸਲਾ ਕਰੋ",
    step3_text: "ਸਾਫ਼ ਗ੍ਰਾਫ਼ ਅਤੇ ਸਿੱਧਾ ਨਤੀਜਾ - ਸਹੀ ਭਾਅ, ਘੱਟ ਭਾਅ, ਜਾਂ ਵੱਧ ਭਾਅ।",

    testimonials_title: "ਕਿਸਾਨ ਕੀ ਕਹਿੰਦੇ ਹਨ",
    testimonial_1_text:
      "ਮੈਨੂੰ ਪਤਾ ਲੱਗਾ ਕਿ ਪਿਆਜ਼ ਲਈ ਮੈਨੂੰ ਸਰਕਾਰੀ ਰੇਟ ਤੋਂ 15% ਘੱਟ ਮਿਲ ਰਿਹਾ ਸੀ। ਅਗਲੀ ਵਾਰ ਮੈਂ ਵੱਖਰੀ ਮੰਡੀ ਚੁਣੀ ਅਤੇ ਵੱਧ ਕਮਾਇਆ।",
    testimonial_1_name: "ਰਮੇਸ਼ ਪਾਟਿਲ",
    testimonial_1_role: "ਪਿਆਜ਼ ਕਿਸਾਨ, ਨਾਸਿਕ",
    testimonial_2_text:
      "ਵਰਤਣ ਵਿੱਚ ਬਹੁਤ ਸੌਖਾ ਹੈ। ਮੈਂ ਸਿਰਫ਼ ਰਸੀਦ ਦੀ ਫ਼ੋਟੋ ਲੈਂਦਾ ਹਾਂ ਅਤੇ ਇਹ ਦੱਸ ਦਿੰਦਾ ਹੈ ਕਿ ਭਾਅ ਸਹੀ ਸੀ ਜਾਂ ਨਹੀਂ। ਮੇਰੇ ਪਿਤਾ ਜੀ ਵੀ ਇਸਨੂੰ ਵਰਤਦੇ ਹਨ।",
    testimonial_2_name: "ਸੁਨੀਤਾ ਜਾਧਵ",
    testimonial_2_role: "ਕਪਾਹ ਕਿਸਾਨ, ਜਲਗਾਂਵ",
    testimonial_3_text:
      "ਕਣਕ ਵੇਚਣ ਤੋਂ ਪਹਿਲਾਂ ਮੈਂ ਐਪ ਵਿੱਚ ਵੇਖਦਾ ਹਾਂ ਕਿ ਇਸ ਹਫ਼ਤੇ ਕਿਹੜੀ ਮੰਡੀ ਬਿਹਤਰ ਭਾਅ ਦੇ ਰਹੀ ਹੈ। ਇਸ ਨਾਲ ਮੇਰੇ ਅਸਲ ਪੈਸੇ ਬਚੇ ਹਨ।",
    testimonial_3_name: "ਵਿਕਰਮ ਮੋਰੇ",
    testimonial_3_role: "ਕਣਕ ਕਿਸਾਨ, ਪੁਣੇ",

    footer_tagline: "ਹਰ ਕਿਸਾਨ ਲਈ ਸਹੀ ਭਾਅ, ਅਸਲ ਡਾਟੇ 'ਤੇ ਆਧਾਰਿਤ।",
    footer_links_title: "ਤੇਜ਼ ਲਿੰਕ",
    footer_contact_title: "ਸੰਪਰਕ ਕਰੋ",
    footer_rights: "ਸਾਰੇ ਹੱਕ ਰਾਖਵੇਂ।",

    login_title: "ਵਾਪਸ ਸੁਆਗਤ ਹੈ",
    login_subtitle: "ਆਪਣੀਆਂ ਰਸੀਦਾਂ ਅਤੇ ਫ਼ਸਲਾਂ ਵੇਖਣ ਲਈ ਲਾਗ ਇਨ ਕਰੋ।",
    signup_title: "ਆਪਣਾ ਖਾਤਾ ਬਣਾਓ",
    signup_subtitle: "ਸਹੀ ਭਾਅ ਲੈਣ ਵਾਲੇ ਹਜ਼ਾਰਾਂ ਕਿਸਾਨਾਂ ਨਾਲ ਜੁੜੋ।",
    label_name: "ਪੂਰਾ ਨਾਮ",
    label_email: "ਈਮੇਲ ਪਤਾ",
    label_password: "ਪਾਸਵਰਡ",
    label_confirm_password: "ਪਾਸਵਰਡ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ",
    btn_login: "ਲਾਗ ਇਨ",
    btn_signup: "ਖਾਤਾ ਬਣਾਓ",
    have_account: "ਪਹਿਲਾਂ ਤੋਂ ਖਾਤਾ ਹੈ?",
    no_account: "ਖਾਤਾ ਨਹੀਂ ਹੈ?",
  },

  // =====================================================================
  // বাংলা  -  BENGALI
  // =====================================================================
  bn: {
    nav_home: "হোম",
    nav_upload: "রসিদ আপলোড করুন",
    nav_check_rates: "দাম দেখুন",
    nav_nearby: "আমার কাছে",
    nav_mandis: "মান্ডি",
    nav_dashboard: "ড্যাশবোর্ড",
    nav_login: "লগ ইন",
    nav_signup: "সাইন আপ",
    nav_logout: "লগ আউট",
    nav_hello: "নমস্কার",
    select_language: "ভাষা",

    hero_badge: "সারা ভারতের কৃষকদের ভরসা",
    hero_title: "আপনার ফসলের আসল দাম জানুন",
    hero_subtitle:
      "আমরা দুটি উৎস থেকে দাম মেলাই: সরকারি মান্ডি রেট, এবং এই অ্যাপ ব্যবহারকারী অন্য কৃষকরা আসলে যা পেয়েছেন - যাতে সরকারি হিসাবের পাশাপাশি বাস্তব প্রমাণও দেখতে পান।",
    hero_cta_primary: "মান্ডি দাম দেখুন",
    hero_cta_secondary: "রসিদ আপলোড করুন",
    hero_slide_1_caption: "50+ ফসলের সরকারি মান্ডি দাম",
    hero_slide_2_caption: "দেখুন কাছের কৃষকরা কত পেয়েছেন",
    hero_slide_3_caption: "যেকোনো ফোন থেকে সেকেন্ডে রসিদ আপলোড করুন",
    hero_slide_4_caption: "আন্দাজে নয়, আত্মবিশ্বাসে বিক্রি করুন",

    stats_farmers: "সাহায্য পাওয়া কৃষক",
    stats_receipts: "যাচাই করা রসিদ",
    stats_crops: "নথিভুক্ত ফসল",
    stats_mandis: "অন্তর্ভুক্ত মান্ডি",

    option_upload_title: "আপনার রসিদ আপলোড করুন",
    option_upload_text:
      "ফসল বিক্রি করেছেন? রসিদ আপলোড করুন। আমরা সেটি পড়ব এবং জানাব দাম ন্যায্য ছিল কিনা - আর আপনার তথ্য অন্য কৃষকদেরও সাহায্য করবে।",
    option_upload_link: "রসিদ আপলোড করুন",
    option_check_title: "বিক্রির আগে দাম দেখুন",
    option_check_text:
      "এখনও বিক্রি করেননি? যেকোনো ফসল খুঁজুন এবং সরকারি রেটের সঙ্গে কাছের কৃষকদের পাওয়া দাম দেখুন - যাতে সেরা মান্ডি ও সেরা দিন বেছে নিতে পারেন।",
    option_check_link: "মান্ডি দাম দেখুন",
    view_dashboard: "অথবা সম্পূর্ণ ড্যাশবোর্ড দেখুন",

    crops_title: "আমরা এই ফসলগুলি দেখি",
    crops_subtitle: "প্রতিটি ফসলের সরকারি রেট ও কৃষকদের জানানো দাম",
    gallery_title: "খেত থেকে মান্ডি পর্যন্ত",
    gallery_subtitle: "প্রতিটি ধাপে আসল দাম",

    how_it_works_title: "এটি কীভাবে কাজ করে",
    how_it_works_subtitle: "ন্যায্য দামের তিনটি সহজ ধাপ",
    step1_title: "১. আপলোড করুন বা খুঁজুন",
    step1_text: "রসিদের ছবি আপলোড করুন, বা দাম দেখতে শুধু ফসলের নাম খুঁজুন।",
    step2_title: "২. দুটি তথ্য উৎস",
    step2_text: "আমরা সরকারি মান্ডি রেট এবং অন্য কৃষকদের জানানো দাম, দুটোই আনি।",
    step3_title: "৩. আত্মবিশ্বাসে সিদ্ধান্ত নিন",
    step3_text: "পরিষ্কার গ্রাফ ও সোজা ফলাফল - ন্যায্য দাম, কম দাম, বা বেশি দাম।",

    testimonials_title: "কৃষকরা কী বলছেন",
    testimonial_1_text:
      "আমি জানতে পারলাম পেঁয়াজের জন্য সরকারি রেটের চেয়ে ১৫% কম পাচ্ছিলাম। পরেরবার অন্য মান্ডি বেছে নিয়ে বেশি আয় করেছি।",
    testimonial_1_name: "রমেশ পাটিল",
    testimonial_1_role: "পেঁয়াজ চাষি, নাসিক",
    testimonial_2_text:
      "ব্যবহার করা খুব সহজ। আমি শুধু রসিদের ছবি তুলি আর এটি বলে দেয় দাম ন্যায্য ছিল কিনা। আমার বাবাও এটি ব্যবহার করেন।",
    testimonial_2_name: "সুনীতা যাদব",
    testimonial_2_role: "তুলা চাষি, জলগাঁও",
    testimonial_3_text:
      "গম বিক্রির আগে আমি অ্যাপে দেখি এই সপ্তাহে কোন মান্ডি ভালো দাম দিচ্ছে। এতে আমার সত্যিকারের টাকা বেঁচেছে।",
    testimonial_3_name: "বিক্রম মোরে",
    testimonial_3_role: "গম চাষি, পুনে",

    footer_tagline: "প্রতিটি কৃষকের জন্য ন্যায্য দাম, সত্যিকারের তথ্যে ভিত্তি করে।",
    footer_links_title: "দ্রুত লিঙ্ক",
    footer_contact_title: "যোগাযোগ করুন",
    footer_rights: "সর্বস্বত্ব সংরক্ষিত।",

    login_title: "আবার স্বাগতম",
    login_subtitle: "আপনার রসিদ ও ফসল দেখতে লগ ইন করুন।",
    signup_title: "আপনার অ্যাকাউন্ট তৈরি করুন",
    signup_subtitle: "ন্যায্য দাম পাওয়া হাজারো কৃষকের সঙ্গে যোগ দিন।",
    label_name: "পুরো নাম",
    label_email: "ইমেল ঠিকানা",
    label_password: "পাসওয়ার্ড",
    label_confirm_password: "পাসওয়ার্ড নিশ্চিত করুন",
    btn_login: "লগ ইন",
    btn_signup: "অ্যাকাউন্ট তৈরি করুন",
    have_account: "আগে থেকে অ্যাকাউন্ট আছে?",
    no_account: "অ্যাকাউন্ট নেই?",
  },

  // =====================================================================
  // தமிழ்  -  TAMIL
  // =====================================================================
  ta: {
    nav_home: "முகப்பு",
    nav_upload: "ரசீதை பதிவேற்று",
    nav_check_rates: "விலை பார்க்க",
    nav_nearby: "அருகில்",
    nav_mandis: "மண்டிகள்",
    nav_dashboard: "டாஷ்போர்டு",
    nav_login: "உள்நுழை",
    nav_signup: "பதிவு செய்",
    nav_logout: "வெளியேறு",
    nav_hello: "வணக்கம்",
    select_language: "மொழி",

    hero_badge: "இந்தியா முழுவதும் விவசாயிகளின் நம்பிக்கை",
    hero_title: "உங்கள் பயிரின் உண்மையான விலையை அறியுங்கள்",
    hero_subtitle:
      "நாங்கள் இரண்டு ஆதாரங்களிலிருந்து விலைகளை இணைக்கிறோம்: அரசு மண்டி விலைகள், மற்றும் இந்த செயலியைப் பயன்படுத்தும் மற்ற விவசாயிகளுக்கு உண்மையில் கிடைத்த விலை - அரசு எண்ணுடன் நேரடி ஆதாரமும் தெரியும்.",
    hero_cta_primary: "மண்டி விலை பார்க்க",
    hero_cta_secondary: "ரசீதை பதிவேற்று",
    hero_slide_1_caption: "50+ பயிர்களுக்கான அரசு மண்டி விலைகள்",
    hero_slide_2_caption: "அருகிலுள்ள விவசாயிகளுக்கு எவ்வளவு கிடைத்தது பாருங்கள்",
    hero_slide_3_caption: "எந்த ஃபோனிலிருந்தும் நொடிகளில் ரசீதைப் பதிவேற்றுங்கள்",
    hero_slide_4_caption: "ஊகத்தில் அல்ல, நம்பிக்கையுடன் விற்பனை செய்யுங்கள்",

    stats_farmers: "உதவி பெற்ற விவசாயிகள்",
    stats_receipts: "ஆய்வு செய்யப்பட்ட ரசீதுகள்",
    stats_crops: "பதிவு செய்யப்பட்ட பயிர்கள்",
    stats_mandis: "உள்ளடக்கிய மண்டிகள்",

    option_upload_title: "உங்கள் ரசீதைப் பதிவேற்றுங்கள்",
    option_upload_text:
      "பயிரை விற்றுவிட்டீர்களா? ரசீதைப் பதிவேற்றுங்கள். நாங்கள் அதைப் படித்து நியாயமான விலை கிடைத்ததா என்று சொல்வோம் - உங்கள் தரவு மற்ற விவசாயிகளுக்கும் உதவும்.",
    option_upload_link: "ரசீதை பதிவேற்று",
    option_check_title: "விற்பதற்கு முன் விலை பாருங்கள்",
    option_check_text:
      "இன்னும் விற்கவில்லையா? எந்த பயிரையும் தேடி அரசு விலையுடன் அருகிலுள்ள விவசாயிகளுக்குக் கிடைத்த விலையையும் பாருங்கள் - சிறந்த மண்டியையும் சிறந்த நாளையும் தேர்வு செய்யலாம்.",
    option_check_link: "மண்டி விலை பார்க்க",
    view_dashboard: "அல்லது முழு டாஷ்போர்டைப் பாருங்கள்",

    crops_title: "நாங்கள் கண்காணிக்கும் பயிர்கள்",
    crops_subtitle: "ஒவ்வொரு பயிருக்கும் அரசு விலை மற்றும் விவசாயிகள் தெரிவித்த விலை",
    gallery_title: "வயலிலிருந்து மண்டி வரை",
    gallery_subtitle: "ஒவ்வொரு படியிலும் உண்மையான விலைகள்",

    how_it_works_title: "இது எப்படி வேலை செய்கிறது",
    how_it_works_subtitle: "நியாயமான விலைக்கு மூன்று எளிய படிகள்",
    step1_title: "1. பதிவேற்று அல்லது தேடு",
    step1_text: "ரசீதின் புகைப்படத்தைப் பதிவேற்றுங்கள், அல்லது விலை பார்க்க பயிரின் பெயரைத் தேடுங்கள்.",
    step2_title: "2. இரண்டு தரவு ஆதாரங்கள்",
    step2_text: "அரசு மண்டி விலையையும் மற்ற விவசாயிகள் தெரிவித்த விலையையும் நாங்கள் கொண்டுவருகிறோம்.",
    step3_title: "3. நம்பிக்கையுடன் முடிவெடுங்கள்",
    step3_text: "தெளிவான வரைபடங்கள் மற்றும் நேரடி முடிவு - நியாயமான விலை, குறைவு, அல்லது அதிகம்.",

    testimonials_title: "விவசாயிகள் என்ன சொல்கிறார்கள்",
    testimonial_1_text:
      "வெங்காயத்திற்கு அரசு விலையை விட 15% குறைவாகக் கிடைத்தது தெரிந்தது. அடுத்த முறை வேறு மண்டியைத் தேர்ந்தெடுத்து அதிகம் சம்பாதித்தேன்.",
    testimonial_1_name: "ரமேஷ் பாட்டீல்",
    testimonial_1_role: "வெங்காய விவசாயி, நாசிக்",
    testimonial_2_text:
      "பயன்படுத்த மிகவும் எளிது. ரசீதின் புகைப்படத்தை எடுத்தால் போதும், விலை நியாயமானதா என்று சொல்லிவிடும். என் தந்தையும் இதைப் பயன்படுத்துகிறார்.",
    testimonial_2_name: "சுனிதா ஜாதவ்",
    testimonial_2_role: "பருத்தி விவசாயி, ஜல்காவ்",
    testimonial_3_text:
      "கோதுமையை விற்கும் முன் இந்த வாரம் எந்த மண்டி நல்ல விலை தருகிறது என்று செயலியில் பார்ப்பேன். இது எனக்கு உண்மையான பணத்தைச் சேமித்துள்ளது.",
    testimonial_3_name: "விக்ரம் மோரே",
    testimonial_3_role: "கோதுமை விவசாயி, புனே",

    footer_tagline: "ஒவ்வொரு விவசாயிக்கும் நியாயமான விலை, உண்மையான தரவின் அடிப்படையில்.",
    footer_links_title: "விரைவு இணைப்புகள்",
    footer_contact_title: "தொடர்பு கொள்ளுங்கள்",
    footer_rights: "அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",

    login_title: "மீண்டும் வரவேற்கிறோம்",
    login_subtitle: "உங்கள் ரசீதுகளையும் பயிர்களையும் பார்க்க உள்நுழையுங்கள்.",
    signup_title: "உங்கள் கணக்கை உருவாக்குங்கள்",
    signup_subtitle: "நியாயமான விலை பெறும் ஆயிரக்கணக்கான விவசாயிகளுடன் இணையுங்கள்.",
    label_name: "முழு பெயர்",
    label_email: "மின்னஞ்சல் முகவரி",
    label_password: "கடவுச்சொல்",
    label_confirm_password: "கடவுச்சொல்லை உறுதிப்படுத்துங்கள்",
    btn_login: "உள்நுழை",
    btn_signup: "கணக்கை உருவாக்கு",
    have_account: "ஏற்கனவே கணக்கு உள்ளதா?",
    no_account: "கணக்கு இல்லையா?",
  },

  // =====================================================================
  // తెలుగు  -  TELUGU
  // =====================================================================
  te: {
    nav_home: "హోమ్",
    nav_upload: "రసీదు అప్‌లోడ్ చేయండి",
    nav_check_rates: "ధరలు చూడండి",
    nav_nearby: "నా దగ్గర",
    nav_mandis: "మండీలు",
    nav_dashboard: "డాష్‌బోర్డ్",
    nav_login: "లాగిన్",
    nav_signup: "సైన్ అప్",
    nav_logout: "లాగ్ అవుట్",
    nav_hello: "నమస్కారం",
    select_language: "భాష",

    hero_badge: "భారతదేశమంతటా రైతుల నమ్మకం",
    hero_title: "మీ పంట అసలు ధరను తెలుసుకోండి",
    hero_subtitle:
      "మేము రెండు వనరుల నుండి ధరలను కలుపుతాము: ప్రభుత్వ మండీ ధరలు, మరియు ఈ యాప్ వాడే ఇతర రైతులకు నిజంగా వచ్చిన ధర - తద్వారా అధికారిక సంఖ్యతో పాటు వాస్తవ ఆధారం కూడా కనిపిస్తుంది.",
    hero_cta_primary: "మండీ ధరలు చూడండి",
    hero_cta_secondary: "రసీదు అప్‌లోడ్ చేయండి",
    hero_slide_1_caption: "50+ పంటలకు ప్రభుత్వ మండీ ధరలు",
    hero_slide_2_caption: "దగ్గరి రైతులకు ఎంత వచ్చిందో చూడండి",
    hero_slide_3_caption: "ఏ ఫోన్ నుండైనా సెకన్లలో రసీదు అప్‌లోడ్ చేయండి",
    hero_slide_4_caption: "ఊహతో కాదు, నమ్మకంతో అమ్మండి",

    stats_farmers: "సహాయం పొందిన రైతులు",
    stats_receipts: "పరిశీలించిన రసీదులు",
    stats_crops: "నమోదైన పంటలు",
    stats_mandis: "చేర్చిన మండీలు",

    option_upload_title: "మీ రసీదు అప్‌లోడ్ చేయండి",
    option_upload_text:
      "పంట అమ్మేశారా? రసీదు అప్‌లోడ్ చేయండి. మేము దాన్ని చదివి న్యాయమైన ధర వచ్చిందా అని చెబుతాము - మీ డేటా ఇతర రైతులకూ సహాయపడుతుంది.",
    option_upload_link: "రసీదు అప్‌లోడ్ చేయండి",
    option_check_title: "అమ్మే ముందు ధరలు చూడండి",
    option_check_text:
      "ఇంకా అమ్మలేదా? ఏ పంటనైనా వెతికి ప్రభుత్వ ధరతో పాటు దగ్గరి రైతులకు వచ్చిన ధరను చూడండి - మంచి మండీని, మంచి రోజును ఎంచుకోవచ్చు.",
    option_check_link: "మండీ ధరలు చూడండి",
    view_dashboard: "లేదా పూర్తి డాష్‌బోర్డ్ చూడండి",

    crops_title: "మేము గమనించే పంటలు",
    crops_subtitle: "ప్రతి పంటకు ప్రభుత్వ ధర మరియు రైతులు తెలిపిన ధర",
    gallery_title: "పొలం నుండి మండీ వరకు",
    gallery_subtitle: "ప్రతి అడుగులో నిజమైన ధరలు",

    how_it_works_title: "ఇది ఎలా పనిచేస్తుంది",
    how_it_works_subtitle: "న్యాయమైన ధరకు మూడు సులభ దశలు",
    step1_title: "1. అప్‌లోడ్ చేయండి లేదా వెతకండి",
    step1_text: "రసీదు ఫోటో అప్‌లోడ్ చేయండి, లేదా ధరలు చూడటానికి పంట పేరు వెతకండి.",
    step2_title: "2. రెండు డేటా వనరులు",
    step2_text: "మేము ప్రభుత్వ మండీ ధర మరియు ఇతర రైతులు తెలిపిన ధర, రెండూ తీసుకొస్తాము.",
    step3_title: "3. నమ్మకంతో నిర్ణయించండి",
    step3_text: "స్పష్టమైన గ్రాఫ్‌లు మరియు సూటి ఫలితం - న్యాయమైన ధర, తక్కువ, లేదా ఎక్కువ.",

    testimonials_title: "రైతులు ఏమంటున్నారు",
    testimonial_1_text:
      "ఉల్లిపాయలకు ప్రభుత్వ ధర కంటే 15% తక్కువ వస్తోందని తెలిసింది. తరువాతిసారి వేరే మండీ ఎంచుకుని ఎక్కువ సంపాదించాను.",
    testimonial_1_name: "రమేష్ పాటిల్",
    testimonial_1_role: "ఉల్లి రైతు, నాసిక్",
    testimonial_2_text:
      "వాడటం చాలా సులభం. నేను రసీదు ఫోటో తీస్తే చాలు, ధర న్యాయమైనదా అని చెబుతుంది. మా నాన్న కూడా దీన్ని వాడతారు.",
    testimonial_2_name: "సునీత జాదవ్",
    testimonial_2_role: "పత్తి రైతు, జల్గావ్",
    testimonial_3_text:
      "గోధుమలు అమ్మే ముందు ఈ వారం ఏ మండీ మంచి ధర ఇస్తోందో యాప్‌లో చూస్తాను. దీనివల్ల నాకు నిజంగా డబ్బు మిగిలింది.",
    testimonial_3_name: "విక్రమ్ మోరే",
    testimonial_3_role: "గోధుమ రైతు, పూణే",

    footer_tagline: "ప్రతి రైతుకు న్యాయమైన ధర, నిజమైన డేటా ఆధారంగా.",
    footer_links_title: "త్వరిత లింక్‌లు",
    footer_contact_title: "సంప్రదించండి",
    footer_rights: "సర్వ హక్కులు రిజర్వ్ చేయబడ్డాయి.",

    login_title: "మళ్ళీ స్వాగతం",
    login_subtitle: "మీ రసీదులు, పంటలు చూడటానికి లాగిన్ అవ్వండి.",
    signup_title: "మీ ఖాతా సృష్టించండి",
    signup_subtitle: "న్యాయమైన ధర పొందుతున్న వేలాది రైతులతో చేరండి.",
    label_name: "పూర్తి పేరు",
    label_email: "ఇమెయిల్ చిరునామా",
    label_password: "పాస్‌వర్డ్",
    label_confirm_password: "పాస్‌వర్డ్ నిర్ధారించండి",
    btn_login: "లాగిన్",
    btn_signup: "ఖాతా సృష్టించండి",
    have_account: "ఇప్పటికే ఖాతా ఉందా?",
    no_account: "ఖాతా లేదా?",
  },

  // =====================================================================
  // ಕನ್ನಡ  -  KANNADA
  // =====================================================================
  kn: {
    nav_home: "ಮುಖಪುಟ",
    nav_upload: "ರಸೀದಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
    nav_check_rates: "ದರ ನೋಡಿ",
    nav_nearby: "ನನ್ನ ಹತ್ತಿರ",
    nav_mandis: "ಮಂಡಿಗಳು",
    nav_dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    nav_login: "ಲಾಗಿನ್",
    nav_signup: "ಸೈನ್ ಅಪ್",
    nav_logout: "ಲಾಗ್ ಔಟ್",
    nav_hello: "ನಮಸ್ಕಾರ",
    select_language: "ಭಾಷೆ",

    hero_badge: "ಭಾರತದಾದ್ಯಂತ ರೈತರ ವಿಶ್ವಾಸ",
    hero_title: "ನಿಮ್ಮ ಬೆಳೆಯ ನಿಜವಾದ ಬೆಲೆ ತಿಳಿಯಿರಿ",
    hero_subtitle:
      "ನಾವು ಎರಡು ಮೂಲಗಳಿಂದ ಬೆಲೆಗಳನ್ನು ಸೇರಿಸುತ್ತೇವೆ: ಸರ್ಕಾರಿ ಮಂಡಿ ದರಗಳು, ಮತ್ತು ಈ ಆ್ಯಪ್ ಬಳಸುವ ಇತರ ರೈತರಿಗೆ ನಿಜವಾಗಿ ಸಿಕ್ಕ ಬೆಲೆ - ಹೀಗಾಗಿ ಅಧಿಕೃತ ಸಂಖ್ಯೆಯ ಜೊತೆಗೆ ನೈಜ ಸಾಕ್ಷ್ಯವೂ ಕಾಣುತ್ತದೆ.",
    hero_cta_primary: "ಮಂಡಿ ದರ ನೋಡಿ",
    hero_cta_secondary: "ರಸೀದಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
    hero_slide_1_caption: "50+ ಬೆಳೆಗಳ ಸರ್ಕಾರಿ ಮಂಡಿ ದರಗಳು",
    hero_slide_2_caption: "ಹತ್ತಿರದ ರೈತರಿಗೆ ಎಷ್ಟು ಸಿಕ್ಕಿತು ನೋಡಿ",
    hero_slide_3_caption: "ಯಾವುದೇ ಫೋನ್‌ನಿಂದ ಕ್ಷಣಗಳಲ್ಲಿ ರಸೀದಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
    hero_slide_4_caption: "ಊಹೆಯಿಂದಲ್ಲ, ವಿಶ್ವಾಸದಿಂದ ಮಾರಿ",

    stats_farmers: "ಸಹಾಯ ಪಡೆದ ರೈತರು",
    stats_receipts: "ಪರಿಶೀಲಿಸಿದ ರಸೀದಿಗಳು",
    stats_crops: "ದಾಖಲಾದ ಬೆಳೆಗಳು",
    stats_mandis: "ಒಳಗೊಂಡ ಮಂಡಿಗಳು",

    option_upload_title: "ನಿಮ್ಮ ರಸೀದಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
    option_upload_text:
      "ಬೆಳೆ ಮಾರಿದ್ದೀರಾ? ರಸೀದಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ. ನಾವು ಅದನ್ನು ಓದಿ ನ್ಯಾಯಯುತ ಬೆಲೆ ಸಿಕ್ಕಿತೇ ಎಂದು ಹೇಳುತ್ತೇವೆ - ನಿಮ್ಮ ಡೇಟಾ ಇತರ ರೈತರಿಗೂ ಸಹಾಯ ಮಾಡುತ್ತದೆ.",
    option_upload_link: "ರಸೀದಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
    option_check_title: "ಮಾರುವ ಮೊದಲು ದರ ನೋಡಿ",
    option_check_text:
      "ಇನ್ನೂ ಮಾರಿಲ್ಲವೇ? ಯಾವುದೇ ಬೆಳೆ ಹುಡುಕಿ ಸರ್ಕಾರಿ ದರದ ಜೊತೆಗೆ ಹತ್ತಿರದ ರೈತರಿಗೆ ಸಿಕ್ಕ ಬೆಲೆಯನ್ನೂ ನೋಡಿ - ಉತ್ತಮ ಮಂಡಿ ಮತ್ತು ಉತ್ತಮ ದಿನ ಆಯ್ಕೆ ಮಾಡಬಹುದು.",
    option_check_link: "ಮಂಡಿ ದರ ನೋಡಿ",
    view_dashboard: "ಅಥವಾ ಪೂರ್ಣ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ನೋಡಿ",

    crops_title: "ನಾವು ಗಮನಿಸುವ ಬೆಳೆಗಳು",
    crops_subtitle: "ಪ್ರತಿ ಬೆಳೆಗೆ ಸರ್ಕಾರಿ ದರ ಮತ್ತು ರೈತರು ತಿಳಿಸಿದ ಬೆಲೆ",
    gallery_title: "ಹೊಲದಿಂದ ಮಂಡಿಯವರೆಗೆ",
    gallery_subtitle: "ಪ್ರತಿ ಹಂತದಲ್ಲೂ ನಿಜವಾದ ಬೆಲೆಗಳು",

    how_it_works_title: "ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ",
    how_it_works_subtitle: "ನ್ಯಾಯಯುತ ಬೆಲೆಗೆ ಮೂರು ಸರಳ ಹಂತಗಳು",
    step1_title: "1. ಅಪ್‌ಲೋಡ್ ಮಾಡಿ ಅಥವಾ ಹುಡುಕಿ",
    step1_text: "ರಸೀದಿಯ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ, ಅಥವಾ ದರ ನೋಡಲು ಬೆಳೆಯ ಹೆಸರು ಹುಡುಕಿ.",
    step2_title: "2. ಎರಡು ಡೇಟಾ ಮೂಲಗಳು",
    step2_text: "ನಾವು ಸರ್ಕಾರಿ ಮಂಡಿ ದರ ಮತ್ತು ಇತರ ರೈತರು ತಿಳಿಸಿದ ಬೆಲೆ, ಎರಡನ್ನೂ ತರುತ್ತೇವೆ.",
    step3_title: "3. ವಿಶ್ವಾಸದಿಂದ ನಿರ್ಧರಿಸಿ",
    step3_text: "ಸ್ಪಷ್ಟ ಗ್ರಾಫ್‌ಗಳು ಮತ್ತು ನೇರ ಫಲಿತಾಂಶ - ನ್ಯಾಯಯುತ ಬೆಲೆ, ಕಡಿಮೆ, ಅಥವಾ ಹೆಚ್ಚು.",

    testimonials_title: "ರೈತರು ಏನು ಹೇಳುತ್ತಾರೆ",
    testimonial_1_text:
      "ಈರುಳ್ಳಿಗೆ ಸರ್ಕಾರಿ ದರಕ್ಕಿಂತ 15% ಕಡಿಮೆ ಸಿಗುತ್ತಿತ್ತು ಎಂದು ತಿಳಿಯಿತು. ಮುಂದಿನ ಬಾರಿ ಬೇರೆ ಮಂಡಿ ಆಯ್ಕೆ ಮಾಡಿ ಹೆಚ್ಚು ಗಳಿಸಿದೆ.",
    testimonial_1_name: "ರಮೇಶ್ ಪಾಟೀಲ್",
    testimonial_1_role: "ಈರುಳ್ಳಿ ರೈತ, ನಾಸಿಕ್",
    testimonial_2_text:
      "ಬಳಸಲು ತುಂಬಾ ಸುಲಭ. ನಾನು ರಸೀದಿಯ ಫೋಟೋ ತೆಗೆದರೆ ಸಾಕು, ಬೆಲೆ ನ್ಯಾಯಯುತವಾಗಿತ್ತೇ ಎಂದು ಹೇಳುತ್ತದೆ. ನನ್ನ ತಂದೆಯೂ ಇದನ್ನು ಬಳಸುತ್ತಾರೆ.",
    testimonial_2_name: "ಸುನೀತಾ ಜಾಧವ್",
    testimonial_2_role: "ಹತ್ತಿ ರೈತ, ಜಲಗಾಂವ್",
    testimonial_3_text:
      "ಗೋಧಿ ಮಾರುವ ಮೊದಲು ಈ ವಾರ ಯಾವ ಮಂಡಿ ಉತ್ತಮ ಬೆಲೆ ಕೊಡುತ್ತಿದೆ ಎಂದು ಆ್ಯಪ್‌ನಲ್ಲಿ ನೋಡುತ್ತೇನೆ. ಇದರಿಂದ ನನಗೆ ನಿಜವಾದ ಹಣ ಉಳಿದಿದೆ.",
    testimonial_3_name: "ವಿಕ್ರಮ್ ಮೋರೆ",
    testimonial_3_role: "ಗೋಧಿ ರೈತ, ಪುಣೆ",

    footer_tagline: "ಪ್ರತಿ ರೈತನಿಗೂ ನ್ಯಾಯಯುತ ಬೆಲೆ, ನಿಜವಾದ ಡೇಟಾ ಆಧಾರದಲ್ಲಿ.",
    footer_links_title: "ತ್ವರಿತ ಲಿಂಕ್‌ಗಳು",
    footer_contact_title: "ಸಂಪರ್ಕಿಸಿ",
    footer_rights: "ಎಲ್ಲಾ ಹಕ್ಕುಗಳು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.",

    login_title: "ಮತ್ತೆ ಸ್ವಾಗತ",
    login_subtitle: "ನಿಮ್ಮ ರಸೀದಿಗಳು ಮತ್ತು ಬೆಳೆಗಳನ್ನು ನೋಡಲು ಲಾಗಿನ್ ಆಗಿ.",
    signup_title: "ನಿಮ್ಮ ಖಾತೆ ರಚಿಸಿ",
    signup_subtitle: "ನ್ಯಾಯಯುತ ಬೆಲೆ ಪಡೆಯುತ್ತಿರುವ ಸಾವಿರಾರು ರೈತರೊಂದಿಗೆ ಸೇರಿ.",
    label_name: "ಪೂರ್ಣ ಹೆಸರು",
    label_email: "ಇಮೇಲ್ ವಿಳಾಸ",
    label_password: "ಪಾಸ್‌ವರ್ಡ್",
    label_confirm_password: "ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ",
    btn_login: "ಲಾಗಿನ್",
    btn_signup: "ಖಾತೆ ರಚಿಸಿ",
    have_account: "ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ?",
    no_account: "ಖಾತೆ ಇಲ್ಲವೇ?",
  },

  // =====================================================================
  // മലയാളം  -  MALAYALAM
  // =====================================================================
  ml: {
    nav_home: "ഹോം",
    nav_upload: "രസീത് അപ്‌ലോഡ് ചെയ്യുക",
    nav_check_rates: "വില പരിശോധിക്കുക",
    nav_nearby: "എനിക്കടുത്ത്",
    nav_mandis: "മണ്ഡികൾ",
    nav_dashboard: "ഡാഷ്‌ബോർഡ്",
    nav_login: "ലോഗിൻ",
    nav_signup: "സൈൻ അപ്പ്",
    nav_logout: "ലോഗ് ഔട്ട്",
    nav_hello: "നമസ്കാരം",
    select_language: "ഭാഷ",

    hero_badge: "ഇന്ത്യയൊട്ടാകെ കർഷകരുടെ വിശ്വാസം",
    hero_title: "നിങ്ങളുടെ വിളയുടെ യഥാർത്ഥ വില അറിയുക",
    hero_subtitle:
      "ഞങ്ങൾ രണ്ട് ഉറവിടങ്ങളിൽ നിന്ന് വിലകൾ ചേർക്കുന്നു: സർക്കാർ മണ്ഡി നിരക്കുകൾ, ഒപ്പം ഈ ആപ്പ് ഉപയോഗിക്കുന്ന മറ്റ് കർഷകർക്ക് യഥാർത്ഥത്തിൽ ലഭിച്ച വില - അതിനാൽ ഔദ്യോഗിക കണക്കിനൊപ്പം യഥാർത്ഥ തെളിവും കാണാം.",
    hero_cta_primary: "മണ്ഡി വില പരിശോധിക്കുക",
    hero_cta_secondary: "രസീത് അപ്‌ലോഡ് ചെയ്യുക",
    hero_slide_1_caption: "50+ വിളകൾക്കുള്ള സർക്കാർ മണ്ഡി വിലകൾ",
    hero_slide_2_caption: "അടുത്തുള്ള കർഷകർക്ക് എത്ര ലഭിച്ചു എന്ന് കാണുക",
    hero_slide_3_caption: "ഏത് ഫോണിൽ നിന്നും നിമിഷങ്ങൾക്കുള്ളിൽ രസീത് അപ്‌ലോഡ് ചെയ്യുക",
    hero_slide_4_caption: "ഊഹത്തിലല്ല, ആത്മവിശ്വാസത്തോടെ വിൽക്കുക",

    stats_farmers: "സഹായം ലഭിച്ച കർഷകർ",
    stats_receipts: "പരിശോധിച്ച രസീതുകൾ",
    stats_crops: "രേഖപ്പെടുത്തിയ വിളകൾ",
    stats_mandis: "ഉൾപ്പെട്ട മണ്ഡികൾ",

    option_upload_title: "നിങ്ങളുടെ രസീത് അപ്‌ലോഡ് ചെയ്യുക",
    option_upload_text:
      "വിള വിറ്റുകഴിഞ്ഞോ? രസീത് അപ്‌ലോഡ് ചെയ്യുക. ഞങ്ങൾ അത് വായിച്ച് ന്യായമായ വില ലഭിച്ചോ എന്ന് പറയും - നിങ്ങളുടെ ഡാറ്റ മറ്റ് കർഷകരെയും സഹായിക്കും.",
    option_upload_link: "രസീത് അപ്‌ലോഡ് ചെയ്യുക",
    option_check_title: "വിൽക്കും മുമ്പ് വില പരിശോധിക്കുക",
    option_check_text:
      "ഇനിയും വിറ്റില്ലേ? ഏത് വിളയും തിരഞ്ഞ് സർക്കാർ നിരക്കിനൊപ്പം അടുത്തുള്ള കർഷകർക്ക് ലഭിച്ച വിലയും കാണുക - മികച്ച മണ്ഡിയും മികച്ച ദിവസവും തിരഞ്ഞെടുക്കാം.",
    option_check_link: "മണ്ഡി വില പരിശോധിക്കുക",
    view_dashboard: "അല്ലെങ്കിൽ പൂർണ്ണ ഡാഷ്‌ബോർഡ് കാണുക",

    crops_title: "ഞങ്ങൾ നിരീക്ഷിക്കുന്ന വിളകൾ",
    crops_subtitle: "ഓരോ വിളയ്ക്കും സർക്കാർ നിരക്കും കർഷകർ അറിയിച്ച വിലയും",
    gallery_title: "വയലിൽ നിന്ന് മണ്ഡിയിലേക്ക്",
    gallery_subtitle: "ഓരോ ഘട്ടത്തിലും യഥാർത്ഥ വിലകൾ",

    how_it_works_title: "ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു",
    how_it_works_subtitle: "ന്യായമായ വിലയിലേക്ക് മൂന്ന് ലളിത ഘട്ടങ്ങൾ",
    step1_title: "1. അപ്‌ലോഡ് ചെയ്യുക അല്ലെങ്കിൽ തിരയുക",
    step1_text: "രസീതിന്റെ ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യുക, അല്ലെങ്കിൽ വില കാണാൻ വിളയുടെ പേര് തിരയുക.",
    step2_title: "2. രണ്ട് ഡാറ്റ ഉറവിടങ്ങൾ",
    step2_text: "സർക്കാർ മണ്ഡി നിരക്കും മറ്റ് കർഷകർ അറിയിച്ച വിലയും ഞങ്ങൾ കൊണ്ടുവരുന്നു.",
    step3_title: "3. ആത്മവിശ്വാസത്തോടെ തീരുമാനിക്കുക",
    step3_text: "വ്യക്തമായ ഗ്രാഫുകളും നേരിട്ടുള്ള ഫലവും - ന്യായമായ വില, കുറവ്, അല്ലെങ്കിൽ കൂടുതൽ.",

    testimonials_title: "കർഷകർ പറയുന്നത്",
    testimonial_1_text:
      "ഉള്ളിക്ക് സർക്കാർ നിരക്കിനേക്കാൾ 15% കുറവ് ലഭിക്കുന്നുണ്ടെന്ന് മനസ്സിലായി. അടുത്ത തവണ വേറൊരു മണ്ഡി തിരഞ്ഞെടുത്ത് കൂടുതൽ സമ്പാദിച്ചു.",
    testimonial_1_name: "രമേഷ് പാട്ടീൽ",
    testimonial_1_role: "ഉള്ളി കർഷകൻ, നാസിക്",
    testimonial_2_text:
      "ഉപയോഗിക്കാൻ വളരെ എളുപ്പം. ഞാൻ രസീതിന്റെ ഫോട്ടോ എടുത്താൽ മതി, വില ന്യായമായിരുന്നോ എന്ന് പറയും. എന്റെ അച്ഛനും ഇത് ഉപയോഗിക്കുന്നു.",
    testimonial_2_name: "സുനിത ജാദവ്",
    testimonial_2_role: "പരുത്തി കർഷക, ജൽഗാവ്",
    testimonial_3_text:
      "ഗോതമ്പ് വിൽക്കും മുമ്പ് ഈ ആഴ്ച ഏത് മണ്ഡി നല്ല വില നൽകുന്നു എന്ന് ആപ്പിൽ നോക്കും. ഇത് എനിക്ക് യഥാർത്ഥ പണം ലാഭിച്ചു.",
    testimonial_3_name: "വിക്രം മോറെ",
    testimonial_3_role: "ഗോതമ്പ് കർഷകൻ, പൂനെ",

    footer_tagline: "എല്ലാ കർഷകർക്കും ന്യായമായ വില, യഥാർത്ഥ ഡാറ്റയുടെ അടിസ്ഥാനത്തിൽ.",
    footer_links_title: "ദ്രുത ലിങ്കുകൾ",
    footer_contact_title: "ബന്ധപ്പെടുക",
    footer_rights: "എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം.",

    login_title: "വീണ്ടും സ്വാഗതം",
    login_subtitle: "നിങ്ങളുടെ രസീതുകളും വിളകളും കാണാൻ ലോഗിൻ ചെയ്യുക.",
    signup_title: "നിങ്ങളുടെ അക്കൗണ്ട് ഉണ്ടാക്കുക",
    signup_subtitle: "ന്യായമായ വില നേടുന്ന ആയിരക്കണക്കിന് കർഷകരോടൊപ്പം ചേരുക.",
    label_name: "പൂർണ്ണ പേര്",
    label_email: "ഇമെയിൽ വിലാസം",
    label_password: "പാസ്‌വേഡ്",
    label_confirm_password: "പാസ്‌വേഡ് സ്ഥിരീകരിക്കുക",
    btn_login: "ലോഗിൻ",
    btn_signup: "അക്കൗണ്ട് ഉണ്ടാക്കുക",
    have_account: "ഇതിനകം അക്കൗണ്ട് ഉണ്ടോ?",
    no_account: "അക്കൗണ്ട് ഇല്ലേ?",
  },

  // =====================================================================
  // ଓଡ଼ିଆ  -  ODIA
  // =====================================================================
  or: {
    nav_home: "ହୋମ",
    nav_upload: "ରସିଦ ଅପଲୋଡ କରନ୍ତୁ",
    nav_check_rates: "ଦର ଦେଖନ୍ତୁ",
    nav_nearby: "ମୋ ପାଖରେ",
    nav_mandis: "ମଣ୍ଡି",
    nav_dashboard: "ଡ୍ୟାସବୋର୍ଡ",
    nav_login: "ଲଗ ଇନ",
    nav_signup: "ସାଇନ ଅପ",
    nav_logout: "ଲଗ ଆଉଟ",
    nav_hello: "ନମସ୍କାର",
    select_language: "ଭାଷା",

    hero_badge: "ସାରା ଭାରତର କୃଷକଙ୍କ ଭରସା",
    hero_title: "ଆପଣଙ୍କ ଫସଲର ପ୍ରକୃତ ଦାମ ଜାଣନ୍ତୁ",
    hero_subtitle:
      "ଆମେ ଦୁଇଟି ଉତ୍ସରୁ ଦର ଏକତ୍ର କରୁ: ସରକାରୀ ମଣ୍ଡି ଦର, ଏବଂ ଏହି ଆପ ବ୍ୟବହାର କରୁଥିବା ଅନ୍ୟ କୃଷକମାନେ ପ୍ରକୃତରେ ପାଇଥିବା ଦାମ - ଯାହାଫଳରେ ସରକାରୀ ସଂଖ୍ୟା ସହିତ ପ୍ରକୃତ ପ୍ରମାଣ ମଧ୍ୟ ଦେଖାଯିବ।",
    hero_cta_primary: "ମଣ୍ଡି ଦର ଦେଖନ୍ତୁ",
    hero_cta_secondary: "ରସିଦ ଅପଲୋଡ କରନ୍ତୁ",
    hero_slide_1_caption: "50+ ଫସଲର ସରକାରୀ ମଣ୍ଡି ଦର",
    hero_slide_2_caption: "ନିକଟବର୍ତ୍ତୀ କୃଷକମାନେ କେତେ ପାଇଲେ ଦେଖନ୍ତୁ",
    hero_slide_3_caption: "ଯେକୌଣସି ଫୋନରୁ କିଛି ସେକେଣ୍ଡରେ ରସିଦ ଅପଲୋଡ କରନ୍ତୁ",
    hero_slide_4_caption: "ଅନୁମାନରେ ନୁହେଁ, ଆତ୍ମବିଶ୍ୱାସରେ ବିକ୍ରି କରନ୍ତୁ",

    stats_farmers: "ସାହାଯ୍ୟ ପାଇଥିବା କୃଷକ",
    stats_receipts: "ଯାଞ୍ଚ ହୋଇଥିବା ରସିଦ",
    stats_crops: "ଲିପିବଦ୍ଧ ଫସଲ",
    stats_mandis: "ଅନ୍ତର୍ଭୁକ୍ତ ମଣ୍ଡି",

    option_upload_title: "ଆପଣଙ୍କ ରସିଦ ଅପଲୋଡ କରନ୍ତୁ",
    option_upload_text:
      "ଫସଲ ବିକ୍ରି କରିସାରିଛନ୍ତି କି? ରସିଦ ଅପଲୋଡ କରନ୍ତୁ। ଆମେ ତାହା ପଢ଼ି କହିବୁ ଉଚିତ ଦାମ ମିଳିଲା କି ନାହିଁ - ଏବଂ ଆପଣଙ୍କ ତଥ୍ୟ ଅନ୍ୟ କୃଷକଙ୍କୁ ମଧ୍ୟ ସାହାଯ୍ୟ କରିବ।",
    option_upload_link: "ରସିଦ ଅପଲୋଡ କରନ୍ତୁ",
    option_check_title: "ବିକ୍ରି ପୂର୍ବରୁ ଦର ଦେଖନ୍ତୁ",
    option_check_text:
      "ଏପର୍ଯ୍ୟନ୍ତ ବିକ୍ରି କରିନାହାନ୍ତି? ଯେକୌଣସି ଫସଲ ଖୋଜି ସରକାରୀ ଦର ସହିତ ନିକଟବର୍ତ୍ତୀ କୃଷକମାନେ ପାଇଥିବା ଦାମ ଦେଖନ୍ତୁ - ଭଲ ମଣ୍ଡି ଓ ଭଲ ଦିନ ବାଛିପାରିବେ।",
    option_check_link: "ମଣ୍ଡି ଦର ଦେଖନ୍ତୁ",
    view_dashboard: "କିମ୍ବା ସମ୍ପୂର୍ଣ୍ଣ ଡ୍ୟାସବୋର୍ଡ ଦେଖନ୍ତୁ",

    crops_title: "ଆମେ ଦେଖୁଥିବା ଫସଲ",
    crops_subtitle: "ପ୍ରତ୍ୟେକ ଫସଲ ପାଇଁ ସରକାରୀ ଦର ଓ କୃଷକଙ୍କ ଜଣାଇଥିବା ଦାମ",
    gallery_title: "ଚାଷଜମିରୁ ମଣ୍ଡି ପର୍ଯ୍ୟନ୍ତ",
    gallery_subtitle: "ପ୍ରତ୍ୟେକ ପାହାଚରେ ପ୍ରକୃତ ଦାମ",

    how_it_works_title: "ଏହା କିପରି କାମ କରେ",
    how_it_works_subtitle: "ଉଚିତ ଦାମ ପାଇଁ ତିନୋଟି ସହଜ ପାହାଚ",
    step1_title: "୧. ଅପଲୋଡ କରନ୍ତୁ କିମ୍ବା ଖୋଜନ୍ତୁ",
    step1_text: "ରସିଦର ଫଟୋ ଅପଲୋଡ କରନ୍ତୁ, କିମ୍ବା ଦର ଦେଖିବାକୁ କେବଳ ଫସଲର ନାମ ଖୋଜନ୍ତୁ।",
    step2_title: "୨. ଦୁଇଟି ତଥ୍ୟ ଉତ୍ସ",
    step2_text: "ଆମେ ସରକାରୀ ମଣ୍ଡି ଦର ଏବଂ ଅନ୍ୟ କୃଷକଙ୍କ ଜଣାଇଥିବା ଦାମ, ଦୁଇଟିଯାକ ଆଣୁ।",
    step3_title: "୩. ଆତ୍ମବିଶ୍ୱାସରେ ନିଷ୍ପତ୍ତି ନିଅନ୍ତୁ",
    step3_text: "ସ୍ପଷ୍ଟ ଗ୍ରାଫ ଓ ସିଧା ଫଳାଫଳ - ଉଚିତ ଦାମ, କମ, କିମ୍ବା ଅଧିକ।",

    testimonials_title: "କୃଷକମାନେ କଣ କହୁଛନ୍ତି",
    testimonial_1_text:
      "ମୁଁ ଜାଣିଲି ପିଆଜ ପାଇଁ ସରକାରୀ ଦରଠାରୁ 15% କମ ମିଳୁଥିଲା। ପରବର୍ତ୍ତୀ ଥର ଅନ୍ୟ ମଣ୍ଡି ବାଛି ଅଧିକ ରୋଜଗାର କଲି।",
    testimonial_1_name: "ରମେଶ ପାଟିଲ",
    testimonial_1_role: "ପିଆଜ ଚାଷୀ, ନାସିକ",
    testimonial_2_text:
      "ବ୍ୟବହାର କରିବା ବହୁତ ସହଜ। ମୁଁ କେବଳ ରସିଦର ଫଟୋ ଉଠାଏ ଏବଂ ଏହା କହିଦିଏ ଦାମ ଉଚିତ ଥିଲା କି ନାହିଁ। ମୋ ବାପା ମଧ୍ୟ ଏହା ବ୍ୟବହାର କରନ୍ତି।",
    testimonial_2_name: "ସୁନୀତା ଯାଦବ",
    testimonial_2_role: "କପା ଚାଷୀ, ଜଳଗାଓଁ",
    testimonial_3_text:
      "ଗହମ ବିକ୍ରି କରିବା ପୂର୍ବରୁ ମୁଁ ଆପରେ ଦେଖେ ଏହି ସପ୍ତାହରେ କେଉଁ ମଣ୍ଡି ଭଲ ଦାମ ଦେଉଛି। ଏଥିରେ ମୋର ପ୍ରକୃତ ଟଙ୍କା ବଞ୍ଚିଛି।",
    testimonial_3_name: "ବିକ୍ରମ ମୋରେ",
    testimonial_3_role: "ଗହମ ଚାଷୀ, ପୁଣେ",

    footer_tagline: "ପ୍ରତ୍ୟେକ କୃଷକଙ୍କ ପାଇଁ ଉଚିତ ଦାମ, ପ୍ରକୃତ ତଥ୍ୟ ଆଧାରରେ।",
    footer_links_title: "ଶୀଘ୍ର ଲିଙ୍କ",
    footer_contact_title: "ଯୋଗାଯୋଗ କରନ୍ତୁ",
    footer_rights: "ସମସ୍ତ ଅଧିକାର ସଂରକ୍ଷିତ।",

    login_title: "ପୁନଶ୍ଚ ସ୍ୱାଗତ",
    login_subtitle: "ଆପଣଙ୍କ ରସିଦ ଓ ଫସଲ ଦେଖିବାକୁ ଲଗ ଇନ କରନ୍ତୁ।",
    signup_title: "ଆପଣଙ୍କ ଖାତା ତିଆରି କରନ୍ତୁ",
    signup_subtitle: "ଉଚିତ ଦାମ ପାଉଥିବା ହଜାର ହଜାର କୃଷକଙ୍କ ସହ ଯୋଗ ଦିଅନ୍ତୁ।",
    label_name: "ପୂରା ନାମ",
    label_email: "ଇମେଲ ଠିକଣା",
    label_password: "ପାସୱାର୍ଡ",
    label_confirm_password: "ପାସୱାର୍ଡ ନିଶ୍ଚିତ କରନ୍ତୁ",
    btn_login: "ଲଗ ଇନ",
    btn_signup: "ଖାତା ତିଆରି କରନ୍ତୁ",
    have_account: "ପୂର୍ବରୁ ଖାତା ଅଛି କି?",
    no_account: "ଖାତା ନାହିଁ କି?",
  },
};
