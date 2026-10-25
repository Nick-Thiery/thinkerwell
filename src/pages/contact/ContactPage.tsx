/**
 * Contact Thinkerwell (/contact, docs/notes/contact-form.md): one form for
 * everyone (educators, organisations, companies), linked from the footer,
 * For organisations and the Educators page.
 *
 * - Four fields: a topic, a name, ONE way to reply (an email address or a
 *   WhatsApp number with its country code) and the message; plus a hidden
 *   field only bots fill in. Nothing about a learner, no account, no upload.
 * - Checked here with the server's own checker (src/contact/enquiry.ts):
 *   each problem is said under its field, and focus goes to the first one.
 * - Sent to this site's /api/contact only (the Content-Security-Policy's
 *   connect-src 'self'), which emails the team through Resend. Nothing is
 *   kept on the device or sent anywhere else.
 * - While sending, the button says so and can't be pressed again. If the
 *   message can't be sent (offline, not set up yet, the provider refused),
 *   everything typed stays, and the page gives the team's email address.
 */
import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import words from 'virtual:thinkerwell/messages/contact';
import { CONTACT_EMAIL } from '../../app/contact';
import { useFullPageTitle } from '../../app/usePageTitle';
import { Button, Icon, TextField } from '../../components/ds';
import { checkEnquiry, ENQUIRY_FIELDS, ENQUIRY_TOPICS, MESSAGE_MAX, NAME_MAX, CONTACT_MAX, type EnquiryErrors, type EnquiryField } from '../../contact/enquiry';
import { useI18n, withWords, type MessageKey } from '../../i18n';
import './ContactPage.css';

type Status = 'idle' | 'sending' | 'sent' | 'failed' | 'busy';

interface Fields {
  topic: string;
  name: string;
  contact: string;
  message: string;
  website: string;
}

const EMPTY: Fields = { topic: '', name: '', contact: '', message: '', website: '' };

/** The words for a field's problem. */
function errorKey(field: EnquiryField, reason: NonNullable<EnquiryErrors[EnquiryField]>): MessageKey {
  if (field === 'topic') return 'contact.error.topic';
  if (field === 'contact') return reason === 'missing' ? 'contact.error.contactMissing' : 'contact.error.contactInvalid';
  const suffix = reason === 'missing' ? 'Missing' : reason === 'short' ? 'Short' : reason === 'long' ? 'Long' : 'Missing';
  return `contact.error.${field}${suffix}` as MessageKey;
}

export function ContactPage() {
  const parent = useI18n();
  const i18n = useMemo(() => withWords(parent, words), [parent]);
  const { t, tx } = i18n;
  useFullPageTitle(t('seo.contact.title'));

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<EnquiryErrors>({});
  /** Once someone has pressed Send, problems are updated as they type. */
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const sending = useRef(false);

  const ids = useId();
  const id = (field: keyof Fields) => `${ids}-${field}`;
  const errorId = (field: EnquiryField) => `${ids}-${field}-error`;
  const statusRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const set = (field: keyof Fields) => (value: string) => {
    const next = { ...fields, [field]: value };
    setFields(next);
    if (checked) {
      const result = checkEnquiry(next);
      setErrors(result.ok ? {} : result.errors);
    }
    if (status === 'failed' || status === 'busy') setStatus('idle');
  };

  const email = CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`} className="tw-contact-email" translate="no">
      {CONTACT_EMAIL}
    </a>
  ) : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending.current) return;
    setChecked(true);
    const result = checkEnquiry(fields);
    if (!result.ok) {
      setErrors(result.errors);
      const first = ENQUIRY_FIELDS.find((field) => result.errors[field]);
      if (first) document.getElementById(id(first))?.focus();
      return;
    }
    setErrors({});
    sending.current = true;
    setStatus('sending');
    let next: Status = 'failed';
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (response.ok) next = 'sent';
      else if (response.status === 429) next = 'busy';
      else if (response.status === 400) {
        const body = (await response.json().catch(() => null)) as { fields?: EnquiryErrors } | null;
        const serverErrors = body?.fields ?? {};
        const first = ENQUIRY_FIELDS.find((field) => serverErrors[field]);
        if (first) {
          setErrors(serverErrors);
          sending.current = false;
          setStatus('idle');
          document.getElementById(id(first))?.focus();
          return;
        }
      }
    } catch {
      // Offline, or the request didn't get through: the same message, and everything typed stays.
    }
    sending.current = false;
    setStatus(next);
    if (next === 'sent') setFields(EMPTY);
    // Say what happened where focus is, so a keyboard or screen reader user hears it.
    requestAnimationFrame(() => statusRef.current?.focus());
  };

  const sendAnother = () => {
    setChecked(false);
    setStatus('idle');
    requestAnimationFrame(() => document.getElementById(id('topic'))?.focus());
  };

  const describedBy = (field: EnquiryField, help?: string) => [errors[field] ? errorId(field) : null, help].filter(Boolean).join(' ') || undefined;
  const fieldError = (field: EnquiryField) => {
    const reason = errors[field];
    if (!reason) return null;
    return (
      <span className="tw-help tw-help-invalid" id={errorId(field)}>
        <Icon name="RotateCcw" size={14} strokeWidth={3} className="tw-help-invalid-icon" />
        {t(errorKey(field, reason))}
      </span>
    );
  };

  return (
    <div className="tw-contact-page">
      <section className="tw-contact-card" aria-labelledby={`${ids}-title`}>
        <header className="tw-contact-head">
          <span className="eyebrow">{t('contact.eyebrow')}</span>
          <h1 id={`${ids}-title`} className="h1" tabIndex={-1}>
            {t('contact.title')}
          </h1>
          <p className="body-lg">{t('contact.intro')}</p>
        </header>

        {status === 'sent' ? (
          <div className="tw-contact-done" role="status" tabIndex={-1} ref={statusRef}>
            <Icon name="Check" size={28} className="tw-contact-done-icon" />
            <p>{t('contact.sent')}</p>
            <Button variant="secondary" icon="Pencil" onClick={sendAnother}>
              {t('contact.sendAnother')}
            </Button>
          </div>
        ) : (
          <form ref={formRef} className="tw-contact-form" noValidate onSubmit={(event) => void submit(event)}>
            {Object.keys(errors).length > 0 ? (
              <p className="tw-contact-summary">
                {t('contact.error.summary')}
              </p>
            ) : null}

            <div className={`tw-field${errors.topic ? ' tw-field-invalid' : ''}`}>
              <label htmlFor={id('topic')}>{t('contact.topicLabel')}</label>
              <select
                id={id('topic')}
                className="tw-contact-select"
                value={fields.topic}
                required
                aria-invalid={errors.topic ? 'true' : undefined}
                aria-describedby={describedBy('topic')}
                onChange={(event) => set('topic')(event.target.value)}
              >
                <option value="" disabled>
                  {t('contact.topicPlaceholder')}
                </option>
                {ENQUIRY_TOPICS.map((topic) => (
                  <option key={topic} value={topic}>
                    {t(`contact.topic${topic[0]!.toUpperCase()}${topic.slice(1)}` as MessageKey)}
                  </option>
                ))}
              </select>
              {fieldError('topic')}
            </div>

            <TextField
              id={id('name')}
              label={t('contact.nameLabel')}
              value={fields.name}
              onValueChange={set('name')}
              autoComplete="name"
              maxLength={NAME_MAX + 20}
              required
              invalid={Boolean(errors.name)}
              helper={errors.name ? t(errorKey('name', errors.name)) : undefined}
            />

            {/* Its help says how to write a WhatsApp number; a problem takes its place, and says it again. */}
            <TextField
              id={id('contact')}
              label={t('contact.contactLabel')}
              value={fields.contact}
              onValueChange={set('contact')}
              autoComplete="email"
              inputMode="email"
              maxLength={CONTACT_MAX}
              required
              invalid={Boolean(errors.contact)}
              helper={errors.contact ? t(errorKey('contact', errors.contact)) : t('contact.contactHelp')}
            />

            <div className={`tw-field${errors.message ? ' tw-field-invalid' : ''}`}>
              <label htmlFor={id('message')}>{t('contact.messageLabel')}</label>
              <textarea
                id={id('message')}
                className="tw-contact-message"
                rows={6}
                value={fields.message}
                placeholder={t('contact.messagePlaceholder')}
                maxLength={MESSAGE_MAX + 200}
                required
                aria-invalid={errors.message ? 'true' : undefined}
                aria-describedby={describedBy('message')}
                onChange={(event) => set('message')(event.target.value)}
              />
              {fieldError('message')}
            </div>

            {/* Only bots fill this in: hidden from people, screen readers and the keyboard. */}
            <div className="tw-contact-trap" aria-hidden="true">
              <label htmlFor={id('website')}>{t('contact.honeypot')}</label>
              <input
                id={id('website')}
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={fields.website}
                onChange={(event) => set('website')(event.target.value)}
              />
            </div>

            <div className="tw-contact-send">
              <Button type="submit" variant="primary" icon="Mail" disabled={status === 'sending'} className="tw-contact-submit">
                {status === 'sending' ? t('contact.sending') : t('contact.send')}
              </Button>
              <p className="tw-contact-note">{t('contact.note')}</p>
              {email ? <p className="tw-contact-note">{tx('contact.orEmail', { email })}</p> : null}
            </div>

            {status === 'failed' || status === 'busy' ? (
              <div className="tw-contact-failed" role="alert" tabIndex={-1} ref={statusRef}>
                <Icon name="RotateCcw" size={20} strokeWidth={3} className="tw-help-invalid-icon" />
                <p>{tx(status === 'busy' ? 'contact.busy' : 'contact.failed', { email: email ?? 'hello@thinkerwell.app' })}</p>
              </div>
            ) : null}
            <p className="tw-visually-hidden" aria-live="polite">
              {status === 'sending' ? t('contact.sending') : ''}
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
