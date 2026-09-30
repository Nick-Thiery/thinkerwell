// Loaded when one of these is first opened (src/app/routes.tsx): the
// Educators page, teacher guides, answer keys, the pilot-day tools (setting
// up a device, the class on it and all its certificates), the partner kit
// (For organisations, the consent form, code cards), the print views and
// the journal. They use the lessons too.
export { EducatorsPage } from '../../pages/EducatorsPage';
export { OrganisationsPage } from '../../pages/OrganisationsPage';
export { CodeCardsPage } from '../../pages/educators/CodeCardsPage';
export { ConsentFormPage } from '../../pages/educators/ConsentFormPage';
export { AllCertificatesPage } from '../../pages/educators/AllCertificatesPage';
export { ClassPage } from '../../pages/educators/ClassPage';
export { SetupPage } from '../../pages/educators/SetupPage';
export { JournalPage } from '../../pages/JournalPage';
export { JournalPrintPage } from '../../pages/print/JournalPrintPage';
export { AnswerKeyRoute } from '../AnswerKeyRoute';
export { LessonPrintRoute } from '../LessonPrintRoute';
export { TeacherGuideRoute } from '../TeacherGuideRoute';
