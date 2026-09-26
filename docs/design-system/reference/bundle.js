/* @ds-bundle: {"format":4,"namespace":"Thinkerwell","components":[{"name":"Icon"},{"name":"Button"},{"name":"ToolToggle"},{"name":"SegmentedControl"},{"name":"Chip"},{"name":"Badge"},{"name":"Logo"},{"name":"Mascot"},{"name":"SiteHeader"},{"name":"StagePath"},{"name":"StageDots"},{"name":"ProgressRing"},{"name":"ProgressBar"},{"name":"SectionBadge"},{"name":"SectionHeader"},{"name":"LessonRow"},{"name":"ContinueCard"},{"name":"TaskCard"},{"name":"ReadingCard"},{"name":"GlossaryTerm"},{"name":"DefinitionCard"},{"name":"EvidenceCard"},{"name":"ChoiceOption"},{"name":"Feedback"},{"name":"QuestionCard"},{"name":"WritingBox"},{"name":"TextField"},{"name":"VideoCard"},{"name":"VoiceButton"},{"name":"ListenBar"},{"name":"VoiceRecorder"},{"name":"StatusBanner"},{"name":"MascotTip"},{"name":"ScoreSummary"},{"name":"LearnerTile"},{"name":"JournalEntry"},{"name":"ActionBar"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  var Frag = React.Fragment;

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) { if (arguments[i]) out.push(arguments[i]); }
    return out.join(' ');
  }
  function rest(props, omit) {
    var o = {};
    for (var k in props) { if (Object.prototype.hasOwnProperty.call(props, k) && omit.indexOf(k) === -1) o[k] = props[k]; }
    return o;
  }

  /* ---------- Icons: 24px stroke glyphs, names follow Lucide so the build can use lucide-react ---------- */
  var P = function (d) { return { t: 'path', d: d }; };
  var C = function (cx_, cy, r) { return { t: 'circle', cx: cx_, cy: cy, r: r }; };
  var R = function (x, y, w, h_, rx) { return { t: 'rect', x: x, y: y, width: w, height: h_, rx: rx || 0 }; };
  var ICONS = {
    BookOpen: [P('M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z'), P('M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z')],
    Pencil: [P('M21.2 6.8a2.8 2.8 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8L2 21.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5z'), P('m15 5 4 4')],
    MessageCircle: [P('M7.9 20A9 9 0 1 0 4 16.1L2 22z')],
    Play: [P('M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z')],
    Pause: [R(6, 4, 4, 16, 1), R(14, 4, 4, 16, 1)],
    RefreshCw: [P('M3 12a9 9 0 0 1 9-9 9.8 9.8 0 0 1 6.7 2.7L21 8'), P('M21 3v5h-5'), P('M21 12a9 9 0 0 1-9 9 9.8 9.8 0 0 1-6.7-2.7L3 16'), P('M8 16H3v5')],
    RotateCcw: [P('M3 12a9 9 0 1 0 9-9 9.8 9.8 0 0 0-6.7 2.7L3 8'), P('M3 3v5h5')],
    Check: [P('M20 6 9 17l-5-5')],
    ArrowRight: [P('M5 12h14'), P('m12 5 7 7-7 7')],
    ArrowLeft: [P('M19 12H5'), P('m12 19-7-7 7-7')],
    ChevronRight: [P('m9 18 6-6-6-6')],
    ChevronDown: [P('m6 9 6 6 6-6')],
    X: [P('M18 6 6 18'), P('m6 6 12 12')],
    Menu: [P('M4 6h16'), P('M4 12h16'), P('M4 18h16')],
    Plus: [P('M5 12h14'), P('M12 5v14')],
    Mic: [P('M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z'), P('M19 10v2a7 7 0 0 1-14 0v-2'), P('M12 19v3')],
    Square: [R(4, 4, 16, 16, 2)],
    Trash2: [P('M3 6h18'), P('M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6'), P('M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'), P('M10 11v6'), P('M14 11v6')],
    Wifi: [P('M12 20h.01'), P('M2 8.8a15 15 0 0 1 20 0'), P('M5 12.9a10 10 0 0 1 14 0'), P('M8.5 16.4a5 5 0 0 1 7 0')],
    Volume2: [P('M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6a1.4 1.4 0 0 1-1 .4H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z'), P('M16 9a5 5 0 0 1 0 6'), P('M19.4 18.4a9 9 0 0 0 0-12.8')],
    Type: [P('M4 7V4h16v3'), P('M9 20h6'), P('M12 4v16')],
    Lightbulb: [P('M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5'), P('M9 18h6'), P('M10 22h4')],
    Clock: [C(12, 12, 10), P('M12 6v6l4 2')],
    Lock: [R(3, 11, 18, 11, 2), P('M7 11V7a5 5 0 0 1 10 0v4')],
    User: [P('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'), C(12, 7, 4)],
    Users: [P('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'), C(9, 7, 4), P('M22 21v-2a4 4 0 0 0-3-3.9'), P('M16 3.1a4 4 0 0 1 0 7.8')],
    Map: [P('M14.1 5.6a2 2 0 0 0 1.8 0l3.7-1.9A1 1 0 0 1 21 4.6v12.8a1 1 0 0 1-.6.9l-4.5 2.3a2 2 0 0 1-1.8 0l-4.2-2.1a2 2 0 0 0-1.8 0l-3.7 1.9A1 1 0 0 1 3 19.4V6.6a1 1 0 0 1 .6-.9l4.5-2.3a2 2 0 0 1 1.8 0z'), P('M15 5.8v15'), P('M9 3.2v15')],
    Landmark: [P('M3 22h18'), P('M6 18v-7'), P('M10 18v-7'), P('M14 18v-7'), P('M18 18v-7'), P('M12 2 20 7H4z')],
    Palette: [P('M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.6-1.7h2c3.1 0 5.6-2.5 5.6-5.6C22 6 17.5 2 12 2z'), C(13.5, 6.5, 1), C(17.5, 10.5, 1), C(8.5, 7.5, 1), C(6.5, 12.5, 1)],
    Scale: [P('m16 16 3-8 3 8c-.9.7-1.9 1-3 1s-2.1-.3-3-1z'), P('m2 16 3-8 3 8c-.9.7-1.9 1-3 1s-2.1-.3-3-1z'), P('M7 21h10'), P('M12 3v18'), P('M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2')],
    HelpCircle: [C(12, 12, 10), P('M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3'), P('M12 17h.01')],
    ClipboardCheck: [R(8, 2, 8, 4, 1), P('M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'), P('m9 14 2 2 4-4')],
    NotebookPen: [P('M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4'), P('M2 6h4'), P('M2 10h4'), P('M2 14h4'), P('M2 18h4'), P('M21.4 5.6a1 1 0 1 0-3-3l-5 5a2 2 0 0 0-.5.9l-.8 2.9a.5.5 0 0 0 .6.6l2.9-.8a2 2 0 0 0 .9-.5z')],
    GraduationCap: [P('M21.4 10.9a1 1 0 0 0 0-1.8L12.8 5.2a2 2 0 0 0-1.7 0L2.6 9.1a1 1 0 0 0 0 1.8l8.6 3.9a2 2 0 0 0 1.7 0z'), P('M22 10v6'), P('M6 12.5V16a6 3 0 0 0 12 0v-3.5')],
    Home: [P('M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8'), P('M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z')],
    Eye: [P('M2.1 12.3a1 1 0 0 1 0-.7 10.8 10.8 0 0 1 19.8 0 1 1 0 0 1 0 .7 10.8 10.8 0 0 1-19.8 0'), C(12, 12, 3)],
    Download: [P('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'), P('m7 10 5 5 5-5'), P('M12 15V3')],
    Printer: [P('M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2'), P('M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6'), R(6, 14, 12, 8, 1)],
    Mail: [R(2, 4, 20, 16, 2), P('m22 7-9 5.7a2 2 0 0 1-2 0L2 7')],
    Globe: [C(12, 12, 10), P('M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20'), P('M2 12h20')],
    Sprout: [P('M7 20h10'), P('M10 20c5.5-2.5.8-6.4 3-10'), P('M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z'), P('M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z')],
    Target: [C(12, 12, 10), C(12, 12, 6), C(12, 12, 2)],
    Info: [C(12, 12, 10), P('M12 16v-4'), P('M12 8h.01')],
    WifiOff: [P('M12 20h.01'), P('M8.5 16.4a5 5 0 0 1 7 0'), P('M5 12.9a10 10 0 0 1 5.2-2.7'), P('M19 12.9a10 10 0 0 0-2-1.5'), P('M2 8.8a15 15 0 0 1 4.2-2.6'), P('M22 8.8a15 15 0 0 0-11.3-3.8'), P('m2 2 20 20')],
    FileText: [P('M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z'), P('M14 2v4a2 2 0 0 0 2 2h4'), P('M10 9H8'), P('M16 13H8'), P('M16 17H8')],
    Package: [P('M11 21.7a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7z'), P('M12 22V12'), P('m3.3 7 8.7 5 8.7-5')],
    Receipt: [P('M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z'), P('M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8'), P('M12 17.5v-11')],
    ImageIcon: [R(3, 3, 18, 18, 2), C(9, 9, 2), P('m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21')],
    Captions: [R(3, 5, 18, 14, 2), P('M7 15h4'), P('M15 15h2'), P('M7 11h2'), P('M13 11h4')],
    Hand: [P('M18 11V6a2 2 0 0 0-4 0v5'), P('M14 10V4a2 2 0 0 0-4 0v2'), P('M10 10.5V6a2 2 0 0 0-4 0v8'), P('M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15')],
    Search: [C(11, 11, 8), P('m21 21-4.3-4.3')],
    LogOut: [P('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'), P('m16 17 5-5-5-5'), P('M21 12H9')]
  };

  function Icon(props) {
    var name = props.name, size = props.size || 20, label = props.label;
    var shapes = ICONS[name] || ICONS.HelpCircle;
    var kids = shapes.map(function (s, i) {
      if (s.t === 'path') return h('path', { key: i, d: s.d });
      if (s.t === 'circle') return h('circle', { key: i, cx: s.cx, cy: s.cy, r: s.r });
      return h('rect', { key: i, x: s.x, y: s.y, width: s.width, height: s.height, rx: s.rx });
    });
    return h('svg', {
      className: cx('tw-icon', props.className), width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      strokeWidth: props.strokeWidth || 2, strokeLinecap: 'round', strokeLinejoin: 'round',
      'aria-hidden': label ? undefined : 'true', role: label ? 'img' : undefined, 'aria-label': label, style: props.style
    }, kids);
  }
  Icon.names = Object.keys(ICONS);

  var STAGES = [
    { id: 'read', label: 'Read', icon: 'BookOpen' },
    { id: 'write', label: 'Write', icon: 'Pencil' },
    { id: 'speak', label: 'Speak', icon: 'MessageCircle' },
    { id: 'watch', label: 'Watch', icon: 'Play' },
    { id: 'reflect', label: 'Reflect', icon: 'RefreshCw' }
  ];
  var SECTIONS = {
    history: { name: 'History & Human Stories', icon: 'Landmark' },
    geography: { name: 'Geography & Our Environment', icon: 'Map' },
    culture: { name: 'Culture, Society & Identity', icon: 'Palette' },
    civics: { name: 'Civics, Media & Everyday Economics', icon: 'Scale' }
  };

  /* ---------- Actions ---------- */
  function Button(props) {
    var variant = props.variant || 'primary';
    var cls = cx('tw-btn', 'tw-btn-' + variant, props.size === 'lg' && 'tw-btn-lg', props.block && 'tw-btn-block', props.className);
    var inner = [
      props.icon ? h(Icon, { key: 'i', name: props.icon, size: props.size === 'lg' ? 22 : 20 }) : null,
      h('span', { key: 't' }, props.children),
      props.iconRight ? h(Icon, { key: 'r', name: props.iconRight, size: props.size === 'lg' ? 22 : 20 }) : null
    ];
    var own = rest(props, ['variant', 'size', 'block', 'icon', 'iconRight', 'className', 'children', 'href']);
    if (props.href) return h('a', Object.assign({}, own, { className: cls, href: props.href }), inner);
    return h('button', Object.assign({ type: 'button' }, own, { className: cls }), inner);
  }

  function ToolToggle(props) {
    var own = rest(props, ['icon', 'pressed', 'tone', 'children', 'className']);
    return h('button', Object.assign({ type: 'button' }, own, {
      className: cx('tw-tool', props.tone === 'support' && 'tw-tool-support', props.className),
      'aria-pressed': props.pressed === undefined ? undefined : (props.pressed ? 'true' : 'false')
    }), props.icon ? h(Icon, { name: props.icon }) : null, h('span', null, props.children));
  }

  function SegmentedControl(props) {
    var options = props.options || [];
    return h('div', { className: cx('tw-seg', props.className), role: 'group', 'aria-label': props.label },
      options.map(function (o, i) {
        var opt = typeof o === 'string' ? { label: o, value: o } : o;
        return h('button', { key: i, type: 'button', 'aria-pressed': opt.value === props.value ? 'true' : 'false', onClick: props.onChange ? function () { props.onChange(opt.value); } : undefined },
          opt.icon ? h(Icon, { name: opt.icon, size: 18 }) : null, opt.label);
      }));
  }

  function Chip(props) {
    var own = rest(props, ['selected', 'icon', 'variant', 'children', 'className', 'role']);
    var isRadio = props.role === 'radio';
    return h('button', Object.assign({ type: 'button' }, own, {
      className: cx('tw-chip', props.variant === 'starter' && 'tw-chip-starter', props.className),
      role: props.role,
      'aria-checked': isRadio ? (props.selected ? 'true' : 'false') : undefined,
      'aria-pressed': !isRadio && props.selected !== undefined ? (props.selected ? 'true' : 'false') : undefined
    }), props.icon ? h(Icon, { name: props.icon, size: 18 }) : null, h('span', null, props.children));
  }

  function Badge(props) {
    return h('span', { className: cx('tw-badge', props.tone && 'tw-badge-' + props.tone, props.className) },
      props.icon ? h(Icon, { name: props.icon, size: 16 }) : null, props.children);
  }

  /* ---------- Brand ---------- */
  function Logo(props) {
    var size = props.size || 44;
    var content = [
      h('img', { key: 'm', src: props.src, alt: '', width: size, height: size, style: { width: size, height: size } }),
      props.wordmark === false ? null : h('span', { key: 'w' }, 'Thinkerwell')
    ];
    return h('a', { className: cx('tw-logo', props.className), href: props.href || '/', 'aria-label': 'Thinkerwell home' }, content);
  }

  function Mascot(props) {
    var size = props.size || 160;
    return h('div', { className: cx('tw-mascot', props.float !== false && 'tw-float', props.className), style: Object.assign({ width: size, height: size }, props.style) },
      h('img', { src: props.src, alt: props.alt || '', width: size, height: size }));
  }

  function Avatar(props) {
    return h('span', { className: cx('tw-avatar', props.large && 'tw-avatar-lg', 'tw-tone-' + (props.tone || 'lavender')), 'aria-hidden': 'true' }, props.initial || (props.name || '?').charAt(0).toUpperCase());
  }

  function SiteHeader(props) {
    var links = props.links || [];
    var learner = props.learner;
    var compact = !!props.compact;
    return h('header', { className: cx('tw-header', compact && 'tw-header-compact', props.className) },
      h(Logo, { src: props.logoSrc, size: compact ? 40 : 46 }),
      compact
        ? h('div', { className: 'tw-header-right' },
            learner ? h('button', { type: 'button', className: 'tw-learner-chip', 'aria-label': 'Switch learner, current: ' + learner.name }, h(Avatar, learner)) : null,
            h('button', { type: 'button', className: 'tw-menu-btn', 'aria-label': 'Open navigation menu' }, h(Icon, { name: 'Menu', size: 26 })))
        : h('div', { className: 'tw-header-right' },
            h('nav', { className: 'tw-nav', 'aria-label': 'Primary' },
              links.map(function (l, i) {
                return h('a', { key: i, href: l.href || '#', 'aria-current': l.active ? 'page' : undefined }, l.icon ? h(Icon, { name: l.icon, size: 18 }) : null, l.label);
              })),
            learner ? h('button', { type: 'button', className: 'tw-learner-chip' }, h(Avatar, learner), h('span', null, learner.name), h(Icon, { name: 'ChevronDown', size: 18 })) : null,
            props.children));
  }

  /* ---------- Progress ---------- */
  function StagePath(props) {
    var done = props.done || [];
    var current = props.current;
    var orientation = props.orientation || 'horizontal';
    var subs = props.sublabels || {};
    return h('nav', { 'aria-label': 'Lesson steps', className: props.className },
      h('ol', { className: cx('tw-stages', orientation === 'vertical' && 'tw-stages-vertical', props.compact && 'tw-stages-compact') },
        STAGES.map(function (s) {
          var isDone = done.indexOf(s.id) !== -1;
          var isNow = s.id === current;
          var mark = isDone && !isNow ? h(Icon, { name: 'Check', size: 18, strokeWidth: 3 }) : h(Icon, { name: s.icon, size: 18 });
          var label = orientation === 'vertical'
            ? h('span', { className: 'tw-step-text' }, h('span', { className: 'tw-step-label' }, s.label), subs[s.id] ? h('span', { className: 'tw-step-sub' }, subs[s.id]) : null)
            : h('span', { className: 'tw-step-label' }, s.label);
          return h('li', { key: s.id, className: cx(isDone && 'tw-done') },
            h('button', { type: 'button', className: 'tw-step', 'aria-current': isNow ? 'step' : undefined, 'aria-label': props.compact ? s.label + (isDone ? ', done' : '') : undefined },
              h('span', { className: 'tw-step-mark' }, mark), label, isDone && !isNow ? h('span', { className: 'tw-sr' }, ', done') : null));
        })));
  }

  function StageDots(props) {
    var done = props.done || [];
    return h('ol', { className: 'tw-dots', 'aria-label': (props.done ? props.done.length : 0) + ' of 5 steps done' },
      STAGES.map(function (s) {
        var d = done.indexOf(s.id) !== -1, n = s.id === props.current;
        return h('li', { key: s.id, className: cx(d && 'tw-done', n && 'tw-now'), title: s.label });
      }));
  }

  function ProgressRing(props) {
    var size = props.size || 56, stroke = props.stroke || Math.max(4, Math.round(size / 10));
    var r = (size - stroke) / 2, c = 2 * Math.PI * r;
    var frac = props.max ? Math.max(0, Math.min(1, (props.value || 0) / props.max)) : 0;
    var label = props.label !== undefined ? props.label : (props.value + '/' + props.max);
    return h('span', { className: cx('tw-ring', props.className), role: 'img', 'aria-label': props.ariaLabel || (props.value + ' of ' + props.max + ' done'), style: { width: size, height: size } },
      h('svg', { width: size, height: size, viewBox: '0 0 ' + size + ' ' + size, 'aria-hidden': 'true' },
        h('circle', { className: 'tw-ring-track', cx: size / 2, cy: size / 2, r: r, fill: 'none', strokeWidth: stroke }),
        frac > 0 ? h('circle', { className: 'tw-ring-fill', cx: size / 2, cy: size / 2, r: r, fill: 'none', strokeWidth: stroke, strokeDasharray: c, strokeDashoffset: c * (1 - frac) }) : null),
      label === null ? null : h('span', { className: 'tw-ring-label', style: { fontSize: Math.round(size * 0.26) } }, label));
  }

  function ProgressBar(props) {
    var frac = props.max ? Math.max(0, Math.min(1, (props.value || 0) / props.max)) : 0;
    return h('div', { className: cx('tw-bar', props.className) },
      props.label || props.valueLabel ? h('div', { className: 'tw-bar-label' }, h('span', null, props.label), h('span', null, props.valueLabel)) : null,
      h('div', { className: 'tw-bar-track', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': props.max, 'aria-valuenow': props.value, 'aria-label': props.label },
        h('div', { className: 'tw-bar-fill', style: { width: (frac * 100) + '%' } })));
  }

  /* ---------- Course ---------- */
  function SectionBadge(props) {
    var s = SECTIONS[props.section] || SECTIONS.history;
    return h('span', { className: cx('tw-secbadge', props.className) },
      h('span', { className: cx('tw-secdisc', 'tw-sec-' + (props.section || 'history')), style: props.size ? { width: props.size, height: props.size } : undefined }, h(Icon, { name: s.icon, size: props.size ? Math.round(props.size * 0.5) : 24 })),
      props.showName === false ? null : h('span', { className: 'tw-secbadge-text' },
        props.number ? h('span', { className: 'tw-secbadge-eyebrow' }, 'Section ' + props.number) : null,
        h('span', { className: 'tw-secbadge-name' }, props.name || s.name)));
  }

  function SectionHeader(props) {
    var s = SECTIONS[props.section] || SECTIONS.history;
    return h('div', { className: cx('tw-sechead', 'tw-sec-' + (props.section || 'history'), props.className), style: props.rounded ? { borderRadius: 'var(--radius-xl)' } : undefined },
      h('span', { className: 'tw-secdisc' }, h(Icon, { name: s.icon, size: 30 })),
      h('div', { className: 'tw-sechead-text' },
        h('span', { className: 'tw-secbadge-eyebrow', style: { color: 'var(--ink)' } }, 'Section ' + (props.number || 1) + (props.total ? ' · ' + props.total + ' lessons' : '')),
        h('h2', { className: 'tw-sechead-title' }, props.title || s.name),
        props.question ? h('p', { className: 'tw-sechead-q', style: { color: 'var(--ink)' } }, props.question) : null),
      props.total ? h(ProgressRing, { value: props.completed || 0, max: props.total, size: 64 }) : null);
  }

  function LessonRow(props) {
    var status = props.status || 'not-started';
    var cta = props.cta || (status === 'completed' ? 'Review' : status === 'in-progress' ? 'Continue' : 'Start');
    var isQuiz = props.kind === 'quiz';
    return h('a', {
      href: props.href || '#', className: cx('tw-row', status === 'completed' && 'tw-row-done', props.highlight && 'tw-row-now', isQuiz && 'tw-row-quiz', props.className),
      'aria-label': (isQuiz ? '' : 'Lesson ' + props.number + ': ') + props.title + '. ' + (status === 'completed' ? 'Completed.' : status === 'in-progress' ? 'In progress.' : 'Not started.')
    },
      h('span', { className: 'tw-row-num', 'aria-hidden': 'true' }, isQuiz ? h(Icon, { name: 'ClipboardCheck', size: 22 }) : status === 'completed' ? h(Icon, { name: 'Check', size: 22, strokeWidth: 3 }) : props.number),
      h('span', { className: 'tw-row-main' },
        h('span', { className: 'tw-row-title' }, props.title),
        props.question ? h('span', { className: 'tw-row-q' }, props.question) : null,
        h('span', { className: 'tw-row-meta' },
          props.time ? h('span', null, h(Icon, { name: 'Clock', size: 16 }), props.time) : null,
          isQuiz ? null : h(StageDots, { done: props.done || (status === 'completed' ? ['read', 'write', 'speak', 'watch', 'reflect'] : []), current: props.current }),
          props.meta ? h('span', null, props.meta) : null)),
      h('span', { className: 'tw-row-cta', 'aria-hidden': 'true' }, cta, h(Icon, { name: 'ArrowRight', size: 18 })));
  }

  function ContinueCard(props) {
    return h('section', { className: cx('tw-continue', props.className), 'aria-label': 'Continue learning' },
      h('div', null,
        h('span', { className: 'tw-continue-eyebrow' }, props.eyebrow || 'Pick up where you left off'),
        h('h2', { className: 'tw-continue-title' }, props.title),
        h('div', { className: 'tw-continue-meta' },
          props.lessonLabel ? h('span', null, props.lessonLabel) : null,
          h(StageDots, { done: props.done || [], current: props.current }),
          props.stageLabel ? h('span', null, props.stageLabel) : null)),
      h(Button, { variant: 'primary', size: 'lg', iconRight: 'ArrowRight', href: props.href || '#' }, props.cta || 'Continue'));
  }

  /* ---------- Lesson ---------- */
  function TaskCard(props) {
    return h('section', { className: cx('tw-task', props.className), style: props.tone === 'lavender' ? { background: 'var(--lavender-wash)' } : undefined },
      h('span', { className: 'tw-task-eyebrow' }, h(Icon, { name: props.icon || 'Target', size: 18 }), props.eyebrow || 'Your task'),
      h('div', { className: 'tw-task-body' }, props.children));
  }

  function ReadingCard(props) {
    return h('article', { className: cx('tw-reading', props.className) },
      props.part ? h('span', { className: 'tw-reading-part' }, props.part) : null,
      props.heading ? h('h3', { className: 'tw-reading-h' }, props.heading) : null,
      h('p', { className: 'tw-reading-text' }, props.children));
  }

  function DefinitionCard(props) {
    return h('div', { className: cx('tw-def', props.floating && 'tw-def-float', props.className), role: props.floating ? 'dialog' : undefined, 'aria-label': props.floating ? 'Meaning of ' + props.word : undefined },
      h('div', { className: 'tw-def-word' }, h('span', null, props.word), props.onClose !== false ? h('button', { type: 'button', className: 'tw-menu-btn', 'aria-label': 'Close', style: { width: 36, height: 36 } }, h(Icon, { name: 'X', size: 18 })) : null),
      h('p', { className: 'tw-def-text' }, props.definition),
      props.example ? h('p', { className: 'tw-def-ex' }, props.example) : null,
      props.listen === false ? null : h(ToolToggle, { icon: 'Volume2', className: 'tw-def-listen' }, 'Hear it'));
  }

  function GlossaryTerm(props) {
    var open = !!props.open;
    return h('span', { className: 'tw-term-wrap' },
      h('button', { type: 'button', className: 'tw-term', 'aria-expanded': open ? 'true' : 'false' }, props.children),
      open ? h(DefinitionCard, { floating: true, word: props.word || props.children, definition: props.definition, example: props.example }) : null);
  }

  var EVIDENCE_ICON = { object: 'Package', document: 'FileText', note: 'NotebookPen', receipt: 'Receipt', drawing: 'ImageIcon', map: 'Map', list: 'FileText' };
  function EvidenceCard(props) {
    return h('article', { className: cx('tw-evidence', props.className) },
      h('div', { className: 'tw-evidence-head' },
        h('span', { className: 'tw-evidence-icon' }, h(Icon, { name: EVIDENCE_ICON[props.kind] || 'FileText', size: 22 })),
        h('span', { className: 'tw-evidence-title' }, props.title)),
      props.items ? h('ul', null, props.items.map(function (t, i) { return h('li', { key: i }, t); })) : null,
      props.text ? h('p', { className: cx('tw-evidence-text', props.quote && 'tw-evidence-quote') }, props.text) : null,
      props.fictional === false ? null : h('span', { className: 'tw-evidence-foot' }, h(Icon, { name: 'Info', size: 16 }), 'Fictional example made for this lesson'));
  }

  function ChoiceOption(props) {
    var state = props.state || 'idle';
    var stateEl = state === 'correct' ? h('span', { className: 'tw-option-state' }, h(Icon, { name: 'Check', size: 18, strokeWidth: 3 }), 'Correct')
      : state === 'retry' ? h('span', { className: 'tw-option-state' }, h(Icon, { name: 'RotateCcw', size: 18 }), 'Not quite') : null;
    return h('button', {
      type: 'button', role: 'radio', 'aria-checked': state === 'idle' ? 'false' : 'true',
      className: cx('tw-option', state === 'correct' && 'tw-option-correct', state === 'retry' && 'tw-option-retry', props.muted && 'tw-option-muted', props.className), disabled: props.disabled
    },
      h('span', { className: 'tw-option-letter', 'aria-hidden': 'true' }, props.letter),
      h('span', { className: 'tw-option-text' }, props.children),
      stateEl);
  }

  function Feedback(props) {
    var tone = props.tone || 'correct';
    return h('div', { className: cx('tw-feedback', 'tw-feedback-' + tone, props.className), role: 'status' },
      h('span', { className: 'tw-feedback-icon' }, h(Icon, { name: tone === 'correct' ? 'Check' : 'RotateCcw', size: 18, strokeWidth: 3 })),
      h('div', null,
        h('span', { className: 'tw-feedback-title' }, props.title || (tone === 'correct' ? 'Correct' : 'Not quite yet')),
        h('span', null, props.children),
        props.action ? h('div', { className: 'tw-feedback-action' }, props.action) : null));
  }

  function QuestionCard(props) {
    var letters = 'ABCDEFG';
    var options = props.options || [];
    return h('section', { className: cx('tw-question', props.className) },
      h('div', { className: 'tw-question-head' },
        props.eyebrow ? h('span', { className: 'tw-question-num' }, props.eyebrow) : null,
        h('h3', { className: 'tw-question-prompt', id: props.id ? props.id + '-q' : undefined }, props.prompt)),
      h('div', { className: 'tw-question-options', role: 'radiogroup', 'aria-labelledby': props.id ? props.id + '-q' : undefined },
        options.map(function (o, i) {
          var state = 'idle';
          if (props.selected === i) state = props.result === 'correct' ? 'correct' : props.result === 'retry' ? 'retry' : 'selected';
          return h(ChoiceOption, { key: i, letter: letters[i], state: state }, o);
        })),
      props.feedback ? h(Feedback, { tone: props.result === 'retry' ? 'retry' : 'correct' }, props.feedback) : null,
      props.children);
  }

  function VoiceButton(props) {
    var on = props.state === 'listening';
    return h('button', { type: 'button', className: cx('tw-voice', on && 'tw-voice-on', props.className), 'aria-pressed': on ? 'true' : 'false' },
      h('span', { className: 'tw-voice-dot', 'aria-hidden': 'true' }, h(Icon, { name: on ? 'Square' : 'Mic', size: 18 })),
      h('span', null, on ? (props.stopLabel || 'Stop') : (props.children || 'Say it')));
  }

  function WritingBox(props) {
    var id = props.id || 'writing';
    var label = props.label ? h('label', { htmlFor: id }, props.label, props.optional ? h('span', { className: 'tw-optional' }, ' (optional)') : null) : null;
    return h('div', { className: cx('tw-writing', props.className) },
      props.dictate ? h('div', { className: 'tw-writing-head' }, label || h('span', null), h(VoiceButton, { state: props.dictate === 'listening' ? 'listening' : 'idle' })) : label,
      h('textarea', { id: id, rows: props.rows || 5, placeholder: props.placeholder, defaultValue: props.value, 'aria-describedby': props.helper ? id + '-help' : undefined }),
      props.helper ? h('span', { className: 'tw-help', id: id + '-help' }, props.helper) : null);
  }

  function TextField(props) {
    var id = props.id || 'field';
    return h('div', { className: cx('tw-field', props.className) },
      h('label', { htmlFor: id }, props.label, props.optional ? h('span', { className: 'tw-optional' }, ' (optional)') : null),
      h('input', { id: id, type: 'text', placeholder: props.placeholder, defaultValue: props.value, autoComplete: 'off', 'aria-describedby': props.helper ? id + '-help' : undefined }),
      props.helper ? h('span', { className: 'tw-help', id: id + '-help' }, props.helper) : null);
  }

  function VideoCard(props) {
    return h('section', { className: cx('tw-video', props.className) },
      h('div', { className: 'tw-video-poster' },
        h(Badge, { tone: 'lemon', className: 'tw-video-tag' }, 'Optional'),
        h('span', { className: 'tw-video-play', 'aria-hidden': 'true' }, h(Icon, { name: 'Play', size: 34 })),
        props.duration ? h(Badge, { tone: 'ink', className: 'tw-video-len', icon: 'Clock' }, props.duration) : null),
      h('div', { className: 'tw-video-body' },
        h('h3', { className: 'tw-video-title' }, props.title),
        h('div', { className: 'tw-video-meta' },
          props.channel ? h('span', null, h(Icon, { name: 'User', size: 16 }), props.channel) : null,
          h('span', null, h(Icon, { name: 'Captions', size: 16 }), props.captions || 'Captions not checked yet'),
          props.language ? h('span', null, h(Icon, { name: 'Globe', size: 16 }), props.language) : null),
        props.children,
        h('div', { className: 'tw-video-actions' },
          h(Button, { variant: 'primary', icon: 'Play' }, 'Watch the video'),
          h(Button, { variant: 'secondary', icon: 'BookOpen' }, props.readLabel || 'Read instead'))));
  }

  function MascotTip(props) {
    var size = props.size || 88;
    return h('div', { className: cx('tw-tip', props.tone && 'tw-tip-' + props.tone, props.className) },
      h(Mascot, { src: props.src, size: size, float: props.float !== false, className: 'tw-tip-mascot' }),
      h('div', { className: 'tw-tip-bubble' }, props.children));
  }

  function ScoreSummary(props) {
    var skills = props.skills || [];
    return h('div', { className: cx('tw-score', props.className) },
      h('ul', { className: 'tw-score-skills' },
        skills.map(function (s, i) {
          return h('li', { key: i, className: 'tw-score-skill' },
            h('span', null, s.name),
            h('span', { className: 'tw-bar-track', role: 'img', 'aria-label': s.got + ' of ' + s.of }, h('span', { className: 'tw-bar-fill', style: { display: 'block', width: (s.of ? (s.got / s.of) * 100 : 0) + '%' } })),
            h('b', null, s.got + '/' + s.of));
        })));
  }

  /* ---------- Learners and journal ---------- */
  function LearnerTile(props) {
    var variant = props.variant || 'person';
    var avatar = variant === 'new' ? h('span', { className: 'tw-avatar tw-avatar-lg' }, h(Icon, { name: 'Plus', size: 30 }))
      : variant === 'guest' ? h('span', { className: 'tw-avatar tw-avatar-lg tw-tone-lemon' }, h(Icon, { name: 'Eye', size: 28 }))
      : h(Avatar, { large: true, tone: props.tone, name: props.name, initial: props.initial });
    return h('button', { type: 'button', className: cx('tw-tile', variant === 'new' && 'tw-tile-new', props.className), 'aria-pressed': props.selected ? 'true' : undefined },
      avatar,
      h('span', { className: 'tw-tile-name' }, props.name),
      props.meta ? h('span', { className: 'tw-tile-meta' }, props.meta) : null);
  }

  function JournalEntry(props) {
    return h('article', { className: cx('tw-entry', props.className) },
      h('div', { className: 'tw-entry-head' },
        h('span', { className: 'tw-entry-lesson' }, 'Lesson ' + props.lessonNumber + ' · ' + props.lessonTitle),
        h(Badge, { tone: props.kind === 'Reflection' ? 'lavender' : 'lemon', icon: props.kind === 'Reflection' ? 'RefreshCw' : 'Pencil' }, props.kind || 'Writing')),
      props.prompt ? h('p', { className: 'tw-entry-prompt' }, props.prompt) : null,
      h('p', { className: 'tw-entry-text' }, props.text),
      h('div', { className: 'tw-entry-foot' }, h('span', null, props.date ? 'Saved ' + props.date : ''), h(Button, { variant: 'ghost', icon: 'Pencil' }, 'Edit')));
  }

  function ListenBar(props) {
    var playing = props.state !== 'paused';
    return h('div', { className: cx('tw-listen', props.className), role: 'group', 'aria-label': 'Reading aloud' },
      h('span', { className: 'tw-listen-label' }, h(Icon, { name: 'Volume2' }), props.label || 'Reading aloud'),
      h('div', { className: 'tw-listen-actions' },
        h(Button, { variant: 'secondary', icon: playing ? 'Pause' : 'Play' }, playing ? 'Pause' : 'Play'),
        h(SegmentedControl, { label: 'Speed', options: [{ label: 'Slow', value: 'slow' }, { label: 'Normal', value: 'normal' }], value: props.speed || 'normal' }),
        h(Button, { variant: 'ghost', icon: 'Square' }, 'Stop')));
  }

  function VoiceRecorder(props) {
    var state = props.state || 'idle';
    var row;
    if (state === 'recording') {
      row = [h('span', { key: 'l', className: 'tw-rec-live' }, h('span', { className: 'tw-rec-dot', 'aria-hidden': 'true' }), 'Recording ' + (props.time || '0:12')),
        h(Button, { key: 's', variant: 'primary', icon: 'Square' }, 'Stop')];
    } else if (state === 'recorded') {
      row = [h(Button, { key: 'p', variant: 'primary', icon: 'Play' }, 'Listen back'),
        h('span', { key: 't', className: 'tw-rec-time' }, props.time || '0:42'),
        h(Button, { key: 'r', variant: 'secondary', icon: 'Mic' }, 'Record again'),
        h(Button, { key: 'd', variant: 'ghost', icon: 'Trash2' }, 'Delete')];
    } else {
      row = [h(Button, { key: 'b', variant: 'primary', icon: 'Mic' }, 'Start recording')];
    }
    return h('section', { className: cx('tw-rec', props.className), 'aria-label': props.title || 'Record yourself' },
      h('div', { className: 'tw-rec-head' },
        h('h3', { className: 'tw-rec-title' }, props.title || 'Record yourself'),
        h('p', { className: 'tw-rec-note' }, h(Icon, { name: 'Lock', size: 16 }), props.note || 'Your recording stays on this device. Nobody else hears it.')),
      props.children,
      h('div', { className: 'tw-rec-row' }, row));
  }

  function StatusBanner(props) {
    var tone = props.tone || 'offline';
    var icon = props.icon || (tone === 'offline' ? 'WifiOff' : tone === 'back' ? 'Wifi' : 'Info');
    return h('div', { className: cx('tw-status', 'tw-status-' + tone, props.className), role: 'status' },
      h(Icon, { name: icon, size: 20 }),
      h('span', { className: 'tw-status-text' }, props.title ? h('strong', null, props.title + ' ') : null, props.children),
      props.action && tone !== 'offline' ? h(Button, { variant: 'ghost' }, props.action) : null);
  }

  function ActionBar(props) {
    return h('div', { className: cx('tw-actionbar', props.className) },
      props.back ? h(Button, { variant: 'ghost', icon: 'ArrowLeft' }, props.back) : h('span', null),
      h('div', { className: 'tw-actionbar-right' },
        props.helper ? h('span', { className: 'tw-actionbar-help', id: 'actionbar-help' }, h(Icon, { name: 'Info', size: 18 }), props.helper) : null,
        h(Button, { variant: 'primary', size: 'lg', iconRight: 'ArrowRight', disabled: props.disabled, 'aria-describedby': props.helper ? 'actionbar-help' : undefined }, props.next || 'Continue')));
  }

  var api = {
    Icon: Icon, Button: Button, ToolToggle: ToolToggle, SegmentedControl: SegmentedControl, Chip: Chip, Badge: Badge,
    Logo: Logo, Mascot: Mascot, SiteHeader: SiteHeader,
    StagePath: StagePath, StageDots: StageDots, ProgressRing: ProgressRing, ProgressBar: ProgressBar,
    SectionBadge: SectionBadge, SectionHeader: SectionHeader, LessonRow: LessonRow, ContinueCard: ContinueCard,
    TaskCard: TaskCard, ReadingCard: ReadingCard, GlossaryTerm: GlossaryTerm, DefinitionCard: DefinitionCard, EvidenceCard: EvidenceCard,
    ChoiceOption: ChoiceOption, Feedback: Feedback, QuestionCard: QuestionCard, WritingBox: WritingBox, TextField: TextField,
    VideoCard: VideoCard, VoiceButton: VoiceButton, ListenBar: ListenBar, VoiceRecorder: VoiceRecorder, StatusBanner: StatusBanner, MascotTip: MascotTip, ScoreSummary: ScoreSummary, LearnerTile: LearnerTile, JournalEntry: JournalEntry, ActionBar: ActionBar,
    Avatar: Avatar, STAGES: STAGES, SECTIONS: SECTIONS
  };
  window.Thinkerwell = window.Thinkerwell || {};
  Object.assign(window.Thinkerwell, api);
})();
