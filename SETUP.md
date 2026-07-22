# חיבור ניהול הבית ל-Supabase ול-GitHub Pages — גרסה 9

בגרסה זו יש חשבון משפחתי משותף אחד. במסך הכניסה לא מופיע מייל — רק סיסמה. המייל נשמר בקובץ `config.js` ומשמש מאחורי הקלעים להתחברות ל-Supabase.

## מה כבר בוצע

- סכמת Supabase נוצרה.
- נוצר משתמש משפחתי משותף.
- המשתמש שויך ל"משפחת זילכה".

## שלב 1 — העתקת פרטי החיבור

1. בפרויקט Supabase לחצי על **Connect** בחלק העליון, או עברי אל **Settings > API Keys**.
2. העתיקי את **Project URL**.
3. העתיקי את **Publishable key** שמתחיל בדרך כלל ב-`sb_publishable_`.
4. אין להשתמש ב-Secret key, ב-`service_role` או בסיסמת מסד הנתונים.

## שלב 2 — עדכון `config.js`

פתחי את הקובץ `config.js` ועדכני רק את שלושת הערכים הריקים:

```js
window.APP_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabasePublishableKey: "sb_publishable_YOUR_KEY",
  sharedLoginEmail: "YOUR_FAMILY_ACCOUNT_EMAIL",
  householdId: "6f0b65b4-4039-4e4b-9620-354ae31dc778",
};
```

- `supabaseUrl`: כתובת הפרויקט.
- `supabasePublishableKey`: המפתח הציבורי.
- `sharedLoginEmail`: המייל שבו יצרת את המשתמש המשפחתי.
- אין להכניס את הסיסמה לקוד. הסיסמה מוזנת רק במסך הכניסה.

## שלב 3 — העלאה ל-GitHub

1. צרי Repository חדש ב-GitHub בשם `nihul-habayit`.
2. העלי לשורש ה-Repository את כל הקבצים שבתיקייה, כולל `.nojekyll` ותיקיית `icons`.
3. ב-GitHub עברי אל **Settings > Pages**.
4. תחת **Build and deployment** בחרי:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
5. שמרי והמתיני עד שתופיע כתובת האתר.

## שלב 4 — בדיקה

1. פתחי את כתובת האתר בטלפון שלך.
2. הזיני רק את הסיסמה המשפחתית.
3. פתחי את אותה כתובת בטלפון של תומר והזיני את אותה סיסמה.
4. הוסיפי מוצר בטלפון אחד וודאי שהוא מופיע בטלפון השני.

## פרטיות

כתובת האתר וקוד האתר יכולים להיות ציבוריים ב-GitHub Pages, אך הנתונים עצמם זמינים רק לאחר התחברות. ההגנה מבוססת על Supabase Auth ועל מדיניות RLS שהוגדרה במסד הנתונים. השתמשו בסיסמה חזקה וייחודית.
