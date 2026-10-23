// Loaded when one of these is first opened (src/app/routes.tsx): the
// Educators page, the list of teacher guides, teacher guides, answer keys,
// the pilot-day tools (setting up a device, the class on it and all its
// certificates), the partner kit (For organisations, the information sheet,
// the consent form, code cards, the session guide for staff, the learning
// check), the contact form,
// the print views and the journal, and Credits. They use the lessons too.
export { ContactPage } from '../../pages/contact/ContactPage';
export { CreditsPage } from '../../pages/CreditsPage';
export { EducatorsPage } from '../../pages/EducatorsPage';
export { OrganisationsPage } from '../../pages/OrganisationsPage';
export { CodeCardsPage } from '../../pages/educators/CodeCardsPage';
export { ConsentFormPage } from '../../pages/educators/ConsentFormPage';
export { PilotDayPage } from '../../pages/educators/PilotDayPage';
export { PilotCheckPage } from '../../pages/educators/pilotCheck/PilotCheckPage';
export { GuidesPage } from '../../pages/educators/GuidesPage';
export { InformationSheetPage } from '../../pages/educators/InformationSheetPage';
export { AllCertificatesPage } from '../../pages/educators/AllCertificatesPage';
export { ClassPage } from '../../pages/educators/ClassPage';
export { SetupPage } from '../../pages/educators/SetupPage';
export { JournalPage } from '../../pages/JournalPage';
export { JournalPrintPage } from '../../pages/print/JournalPrintPage';
export { AnswerKeyRoute } from '../AnswerKeyRoute';
export { LessonPrintRoute } from '../LessonPrintRoute';
export { TeacherGuideRoute } from '../TeacherGuideRoute';
