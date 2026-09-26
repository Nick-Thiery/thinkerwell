# SiteHeader

The yellow header with logo, five links and the current learner; compact on phones.

Props: `logoSrc`, `links` (`{label, href, icon, active}`), `learner` (`{name, tone}` or null), `compact` (phone: logo, learner avatar and a menu button), `children` (extra controls at the end).

- Links, in order: Home, Course, My journal, For educators, About.
- The learner chip opens the learner switcher. With no learner chosen, show nothing there.
