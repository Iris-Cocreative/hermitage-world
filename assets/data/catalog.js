/* ==========================================================================
   The Hermitage Library — the whole catalog, for the library prototype
   (/library/). CMS-shaped: one flat list of items plus people and paths.
   --------------------------------------------------------------------------
   Sources:
   - Titles, volume and track numbers, credits, descriptions and prices come
     from the hermitageindy.org shop (WooCommerce store API, read 2026-10-23):
     41 MP3 tracks, 11 Opus CD sets, Vol. 22, the Success: Full Living album,
     three books and the trilogy, and the spring 2026 classes.
   - The three named videos and the homily and teaching hours come from the
     Collab OS surface (see assets/data/library.js, `known: true`).
   - Program copy comes from the program pages on this site.

   Still unknown, so never invented here: durations (minutes: null), which
   tracks are free (the policy is "healing meditations free, the rest at a
   small price"; `freeDraft: true` marks our reading of it), who voices the
   volumes the shop credits only to the "Hermitage Meditation Series", and
   prices under membership (phase two).

   Fields
     id, kind      track | album | book | set | video | series | program | circle
     title, blurb  blurb is the shop's description, lightly corrected
     thick         books only: relative spine thickness, 1–3
     by            person ids (PEOPLE); 'series' = Hermitage Meditation Series
     voice         justin | community | together  (whose voice it carries)
     album, vol, track   for tracks: the album id, volume and track number
     occasion      ids from OCCASIONS (when or why you would reach for it)
     access        free | price | soon | elsewhere
     price         USD, for access: price
     rel           { partOf: [id], companion: [id], reads: [id], form: [id] }
     minutes       null until Garry's catalog arrives
     year          when known
   ========================================================================== */
(function () {
  'use strict';

  var PEOPLE = {
    justin: { name: 'Friar Justin Belitz, OFM', short: 'Friar Justin', role: 'Founder of the Hermitage, 1985' },
    series: { name: 'Hermitage Meditation Series', short: 'Meditation Series', role: 'The Hermitage’s recorded meditations, on CD and MP3' },
    samuel: { name: 'Samuel Robinson', short: 'Samuel', role: 'Program director; Unified Mindfulness coach' },
    peggy: { name: 'Peggy Alderman', short: 'Peggy', role: 'Co-facilitator, The Universal Christ circle' },
    mcroberts: { name: 'Daniel McRoberts', short: 'Daniel McRoberts', role: 'Children’s meditations, Vol. 13' },
    coddington: { name: 'Therese Coddington', short: 'Therese Coddington', role: 'Vol. 16' },
    pillaer: { name: 'Sr. Barbara Pillaer, OSF', short: 'Sr. Barbara Pillaer', role: 'Flute, Vol. 15' },
    wild: { name: 'Mary Wild', short: 'Mary Wild', role: 'Harp, Vol. 15' },
    carroll: { name: 'Rob Carroll', short: 'Rob Carroll', role: 'Clarinet, Vol. 17' },
    consentino: { name: 'Andy Consentino', short: 'Andy Consentino', role: 'Synthesizer, Vol. 17' },
    cannaday: { name: 'John Cannaday', short: 'John Cannaday', role: 'Music, Vol. 21' },
    jeffers: { name: 'Tim Jeffers', short: 'Tim Jeffers', role: 'Vocalist, Vol. 21' },
    rohr: { name: 'Richard Rohr', short: 'Richard Rohr', role: 'Franciscan author' }
  };

  // When or why you would reach for something. Read from the descriptions.
  var OCCASIONS = {
    beginning: 'Beginning',
    morning: 'Morning',
    evening: 'Evening & sleep',
    healing: 'Healing',
    together: 'With a group',
    text: 'Praying with a text',
    music: 'Music',
    life: 'Life & habits',
    young: 'Young people'
  };

  // Each album and track takes one glass color in the window view: light, never UI.
  var GLASS = { amber: 'morning, beginning, music', blue: 'evening, sleep, young people', verdigris: 'healing, life', madder: 'prayer, texts, groups' };

  var ITEMS = [
    /* ------------------------------------------------------------ albums */
    { id: 'opus-1', kind: 'album', title: 'Opus I', sub: 'Vols. 1 & 7', by: ['series'], voice: 'justin', occasion: ['beginning', 'morning', 'evening'], access: 'price', price: 15,
      blurb: 'A universal morning and evening meditation, made for people of any faith, with Basic Relaxation for anyone beginning or finding it hard to relax.' },
    { id: 'opus-2', kind: 'album', title: 'Opus II', sub: 'Vols. 2 & 3', by: ['series'], voice: 'justin', occasion: ['morning', 'evening', 'text'], access: 'price', price: 15,
      blurb: 'A Christian morning and evening meditation, using the image of Jesus, and a pair of contemplative prayers that persons of any faith can use.' },
    { id: 'opus-3', kind: 'album', title: 'Opus III', sub: 'Vols. 4 & 16', by: ['series', 'coddington'], voice: 'justin', occasion: ['life'], access: 'price', price: 15,
      blurb: 'Creating and maintaining ideal weight, and, by Therese Coddington, a meditation for those wishing to be non-smokers.' },
    { id: 'opus-4', kind: 'album', title: 'Opus IV', sub: 'Vols. 5 & 10', by: ['series'], voice: 'justin', occasion: ['healing', 'together', 'life'], access: 'price', price: 15,
      blurb: 'Healing Relationships, for one person and for a group, and Positive Self Image: how mind and brain create self-image, then affirmations to improve it.' },
    { id: 'opus-5', kind: 'album', title: 'Opus V', sub: 'Vols. 6 & 9', by: ['series'], voice: 'justin', occasion: ['healing'], access: 'price', price: 15,
      blurb: 'Healing Self, for anyone who is ill in body, mind, emotion or spirit, and its companion Healing Others, for family and friends of a patient.' },
    { id: 'opus-6', kind: 'album', title: 'Opus VI', sub: 'Vols. 8 & 14', by: ['series'], voice: 'justin', occasion: ['text', 'together'], access: 'price', price: 15,
      blurb: 'The Lord’s Prayer and the Prayer of St. Francis, as examples of meditating on any text, and a meditation for world peace, alone or in a group.' },
    { id: 'opus-7', kind: 'album', title: 'Opus VII', sub: 'Vols. 13 & 18', by: ['mcroberts', 'series'], voice: 'community', occasion: ['young', 'evening'], access: 'price', price: 15,
      blurb: 'Children’s meditations by Daniel McRoberts, in the voice of a thirteen-year-old boy, and Angels Among Us: angels as God’s messengers, then a meditation with them.' },
    { id: 'opus-8', kind: 'album', title: 'Opus VIII', sub: 'Vols. 11 & 12', by: ['series'], voice: 'justin', occasion: ['text'], access: 'price', price: 15,
      blurb: 'My Friend the Sea, poems on moments in Fr. Justin’s life, and the 23rd Psalm and St. Francis’s Canticle of Praise as meditations on a familiar text.' },
    { id: 'opus-9', kind: 'album', title: 'Opus IX', sub: 'Vols. 15 & 17', by: ['pillaer', 'wild', 'carroll', 'consentino'], voice: 'community', occasion: ['music'], access: 'price', price: 15,
      blurb: 'Music for meditation: flute and harp from Sr. Barbara Pillaer and Mary Wild; clarinet and synthesizer from Rob Carroll and Andy Consentino.' },
    { id: 'opus-10', kind: 'album', title: 'Opus X', sub: 'Vols. 19 & 20', by: ['series'], voice: 'justin', occasion: ['young', 'life'], access: 'price', price: 15,
      blurb: 'Learning made fast and easy, for students, and teaching made efficient and effective, for teachers: relaxation, visualization and other tools.' },
    { id: 'opus-11', kind: 'album', title: 'Opus XI', sub: 'Vol. 21 · Ho’oponopono', by: ['justin', 'cannaday', 'jeffers'], voice: 'justin', occasion: ['text', 'healing'], access: 'price', price: 15, year: 2007,
      blurb: 'Ho’oponopono and other contemplative meditations, with music by John Cannaday and vocals by Tim Jeffers.' },
    { id: 'vol-22', kind: 'album', title: 'We Are One', sub: 'Vol. 22 · Creation Spirituality', by: ['justin'], voice: 'justin', occasion: ['text'], access: 'price', price: 15,
      blurb: 'The essence of Franciscan spirituality, the Creation Model, then applied to the Peace Prayer of St. Francis and to the Serenity Prayer.' },
    { id: 'sfl-album', kind: 'album', title: 'Success: Full Living', sub: 'A mini-retreat on 3 CDs', by: ['justin'], voice: 'justin', occasion: ['life'], access: 'price', price: 30, discs: 3,
      rel: { form: ['sfl-book', 'sfl-series', 'sfl-program'] },
      blurb: 'Friar Justin’s flagship program as a retreat you can take at home.' },

    /* ------------------------------------------------------------ tracks */
    { id: 't-universal-am', kind: 'track', album: 'opus-1', vol: 1, track: 1, title: 'A Universal Morning Meditation', by: ['series'], voice: 'justin', occasion: ['morning', 'beginning'], access: 'price', price: 3.99, rel: { companion: ['t-universal-pm'] },
      blurb: 'One of a pair, for morning and evening. The image of light represents God, and it was made for people of any faith.' },
    { id: 't-universal-pm', kind: 'track', album: 'opus-1', vol: 1, track: 2, title: 'A Universal Evening Meditation', by: ['series'], voice: 'justin', occasion: ['evening', 'beginning'], access: 'price', price: 3.99, rel: { companion: ['t-universal-am'] },
      blurb: 'The evening half of the universal pair. Light stands for God, for people of any faith.' },
    { id: 't-relaxation', kind: 'track', album: 'opus-1', vol: 7, track: 3, title: 'Basic Relaxation', by: ['series'], voice: 'justin', occasion: ['beginning'], access: 'price', price: 3.99,
      blurb: 'Made for people who are beginning meditation or who have trouble relaxing.' },
    { id: 't-christian-am', kind: 'track', album: 'opus-2', vol: 2, track: 1, title: 'A Christian Morning Meditation', by: ['series'], voice: 'justin', occasion: ['morning', 'text'], access: 'price', price: 3.99, rel: { companion: ['t-christian-pm'] },
      blurb: 'One of a pair, for morning and evening. The image of Jesus is used so that any Christian can use it.' },
    { id: 't-christian-pm', kind: 'track', album: 'opus-2', vol: 2, track: 2, title: 'A Christian Evening Meditation', by: ['series'], voice: 'justin', occasion: ['evening', 'text'], access: 'price', price: 3.99, rel: { companion: ['t-christian-am'] },
      blurb: 'The evening half of the Christian pair, with the image of Jesus.' },
    { id: 't-contemplative-am', kind: 'track', album: 'opus-2', vol: 3, track: 3, title: 'Contemplative Prayer: Morning', by: ['series'], voice: 'justin', occasion: ['morning'], access: 'price', price: 3.99, rel: { companion: ['t-contemplative-pm'] },
      blurb: 'An example of passive meditation that persons of any faith can use. One of a morning and evening pair.' },
    { id: 't-contemplative-pm', kind: 'track', album: 'opus-2', vol: 3, track: 4, title: 'Contemplative Prayer: Evening', by: ['series'], voice: 'justin', occasion: ['evening'], access: 'price', price: 3.99, rel: { companion: ['t-contemplative-am'] },
      blurb: 'The evening half of the contemplative pair: passive meditation for persons of any faith.' },
    { id: 't-weight', kind: 'track', album: 'opus-3', vol: 4, track: 1, title: 'Creating and Maintaining Ideal Weight', by: ['series'], voice: 'justin', occasion: ['life'], access: 'price', price: 3.99,
      blurb: 'Designed to help anyone reach ideal weight.' },
    { id: 't-smoking', kind: 'track', album: 'opus-3', vol: 16, track: 2, title: 'Controlling the Smoking Habit', by: ['coddington'], voice: 'community', occasion: ['life'], access: 'price', price: 3.99,
      blurb: 'A meditation for those wishing to be non-smokers.' },
    { id: 't-relationships-1', kind: 'track', album: 'opus-4', vol: 5, track: 1, title: 'Healing Relationships (private)', by: ['series'], voice: 'justin', occasion: ['healing'], access: 'free', freeDraft: true, rel: { companion: ['t-relationships-group'] },
      blurb: 'Helps the meditator develop a positive attitude toward anyone, especially people who are difficult to be with or to work with. For one person.' },
    { id: 't-relationships-group', kind: 'track', album: 'opus-4', vol: 5, track: 2, title: 'Healing Relationships (group)', by: ['series'], voice: 'justin', occasion: ['healing', 'together'], access: 'free', freeDraft: true, rel: { companion: ['t-relationships-1'] },
      blurb: 'The group version: a positive attitude toward anyone, held together.' },
    { id: 't-self-image', kind: 'track', album: 'opus-4', vol: 10, track: 3, title: 'Positive Self Image: How Self Image Works', by: ['series'], voice: 'justin', occasion: ['life'], access: 'price', price: 3.99, rel: { companion: ['t-affirmations'] },
      blurb: 'Explains how mind and brain create self-image. The meditation follows on the next track.' },
    { id: 't-affirmations', kind: 'track', album: 'opus-4', vol: 10, track: 4, title: 'Positive Self Image: Affirmations and Reflections', by: ['series'], voice: 'justin', occasion: ['life'], access: 'price', price: 3.99, rel: { companion: ['t-self-image'] },
      blurb: 'A meditation on several positive affirmations, designed to improve anyone’s self-image.' },
    { id: 't-healing-self', kind: 'track', album: 'opus-5', vol: 6, track: 1, title: 'Healing Self', by: ['series'], voice: 'justin', occasion: ['healing'], access: 'free', freeDraft: true, rel: { companion: ['t-healing-others-1'] },
      blurb: 'For anyone who is ill, physically, mentally, emotionally, psychologically or spiritually: producing and maintaining perfect health.' },
    { id: 't-healing-others-1', kind: 'track', album: 'opus-5', vol: 9, track: 2, title: 'Healing Others (private)', by: ['series'], voice: 'justin', occasion: ['healing'], access: 'free', freeDraft: true, rel: { companion: ['t-healing-self', 't-healing-others-group'] },
      blurb: 'For the family and friends of a patient, and a companion to Healing Self. For one person.' },
    { id: 't-healing-others-group', kind: 'track', album: 'opus-5', vol: 9, track: 3, title: 'Healing Others (group)', by: ['series'], voice: 'justin', occasion: ['healing', 'together'], access: 'free', freeDraft: true, rel: { companion: ['t-healing-others-1'] },
      blurb: 'Healing Others for a group: family and friends of a patient, meditating together.' },
    { id: 't-st-francis', kind: 'track', album: 'opus-6', vol: 8, track: 1, title: 'Meditation on the Prayer of St. Francis', by: ['series'], voice: 'justin', occasion: ['text'], access: 'price', price: 3.99, rel: { companion: ['t-lords-prayer'] },
      blurb: 'An example of how a person can use meditation on any given text.' },
    { id: 't-lords-prayer', kind: 'track', album: 'opus-6', vol: 8, track: 2, title: 'Meditation on the Lord’s Prayer', by: ['series'], voice: 'justin', occasion: ['text'], access: 'price', price: 3.99, rel: { companion: ['t-st-francis'] },
      blurb: 'The second example of how meditation can be used on any given text.' },
    { id: 't-peace-1', kind: 'track', album: 'opus-6', vol: 14, track: 3, title: 'Meditation for World Peace (for one person)', by: ['series'], voice: 'justin', occasion: ['text'], access: 'price', price: 3.99, rel: { companion: ['t-peace-group'] },
      blurb: 'Helps the meditator develop a cosmic dimension of peace.' },
    { id: 't-peace-group', kind: 'track', album: 'opus-6', vol: 14, track: 4, title: 'Meditation for World Peace (for a group)', by: ['series'], voice: 'justin', occasion: ['together'], access: 'price', price: 3.99, rel: { companion: ['t-peace-1'] },
      blurb: 'The world peace meditation, for a group to hold together.' },
    { id: 't-white-light', kind: 'track', album: 'opus-7', vol: 13, track: 1, title: 'Children’s Meditation: White Light Relaxation', by: ['mcroberts'], voice: 'community', occasion: ['young'], access: 'price', price: 3.99, rel: { companion: ['t-golden-light'] },
      blurb: 'Especially for children, though adults can use it too. The voice is a thirteen-year-old boy’s.' },
    { id: 't-golden-light', kind: 'track', album: 'opus-7', vol: 13, track: 2, title: 'Children’s Meditation: Golden Light Sleeping', by: ['mcroberts'], voice: 'community', occasion: ['young', 'evening'], access: 'price', price: 3.99, rel: { companion: ['t-white-light'] },
      blurb: 'The second children’s meditation, to help the meditator fall asleep.' },
    { id: 't-angels-1', kind: 'track', album: 'opus-7', vol: 18, track: 3, title: 'Angels Among Us: An Explanation of Angels', by: ['series'], voice: 'justin', occasion: ['text'], access: 'price', price: 3.99, rel: { companion: ['t-angels-2'] },
      blurb: 'An explanation of angels as God’s messengers.' },
    { id: 't-angels-2', kind: 'track', album: 'opus-7', vol: 18, track: 4, title: 'Angels Among Us: An Angel Meditation', by: ['series'], voice: 'justin', occasion: ['life'], access: 'price', price: 3.99, rel: { companion: ['t-angels-1'] },
      blurb: 'A guided meditation to connect with your angels when working through challenges or difficulties, or planning your future.' },
    { id: 't-poems', kind: 'track', album: 'opus-8', vol: 11, track: 1, title: 'My Friend the Sea: Selected Poems', by: ['series'], voice: 'justin', occasion: ['text'], access: 'price', price: 3.99, rel: { companion: ['t-sea'] },
      blurb: 'Poetry is meditation. Poems on beautiful moments in the life of Fr. Justin, in the hope that you will write your own.' },
    { id: 't-sea', kind: 'track', album: 'opus-8', vol: 11, track: 2, title: 'My Friend the Sea', by: ['series'], voice: 'justin', occasion: ['text'], access: 'price', price: 3.99, rel: { companion: ['t-poems'] },
      blurb: 'The title poem of Volume 11.' },
    { id: 't-psalm-23', kind: 'track', album: 'opus-8', vol: 12, track: 3, title: 'Centering Prayer: The 23rd Psalm', by: ['series'], voice: 'justin', occasion: ['text'], access: 'price', price: 3.99, rel: { companion: ['t-canticle'] },
      blurb: 'How meditation can be used with any familiar text, scripture, poem or prayer.' },
    { id: 't-canticle', kind: 'track', album: 'opus-8', vol: 12, track: 4, title: 'Centering Prayer: The Canticle of Praise by St. Francis', by: ['series'], voice: 'justin', occasion: ['text'], access: 'price', price: 3.99, rel: { companion: ['t-psalm-23'] },
      blurb: 'St. Francis’s Canticle of Praise, the second centering prayer on Volume 12.' },
    { id: 't-flute', kind: 'track', album: 'opus-9', vol: 15, track: 1, title: 'Music for Meditation: Flute', by: ['pillaer'], voice: 'community', occasion: ['music'], access: 'price', price: 3.99,
      blurb: 'Flute music only, by Sr. Barbara Pillaer, OSF.' },
    { id: 't-harp', kind: 'track', album: 'opus-9', vol: 15, track: 2, title: 'Music for Meditation: Harp', by: ['wild'], voice: 'community', occasion: ['music'], access: 'price', price: 3.99,
      blurb: 'Harp music only, by Mary Wild.' },
    { id: 't-clarinet', kind: 'track', album: 'opus-9', vol: 17, track: 3, title: 'Music for Meditation: Clarinet', by: ['carroll'], voice: 'community', occasion: ['music'], access: 'price', price: 3.99,
      blurb: 'Clarinet music only, by Rob Carroll.' },
    { id: 't-synth', kind: 'track', album: 'opus-9', vol: 17, track: 4, title: 'Music for Meditation: Synthesizer', by: ['consentino'], voice: 'community', occasion: ['music'], access: 'price', price: 3.99,
      blurb: 'Synthesizer music only, by Andy Consentino.' },
    { id: 't-students', kind: 'track', album: 'opus-10', vol: 19, track: 1, title: 'Learning (made fast and easy): For Students Only', by: ['series'], voice: 'justin', occasion: ['young'], access: 'price', price: 3.99, rel: { companion: ['t-teachers'] },
      blurb: 'Shows students how to use meditation to learn faster and more easily, with other suggestions for effective study.' },
    { id: 't-teachers', kind: 'track', album: 'opus-10', vol: 20, track: 2, title: 'Teaching (made efficient and effective): For Teachers Only', by: ['series'], voice: 'justin', occasion: ['life'], access: 'price', price: 3.99, rel: { companion: ['t-students'] },
      blurb: 'For teachers who want to be more efficient and effective in the classroom: relaxation, visualization and other tools that help learning.' },
    { id: 't-hooponopono-1', kind: 'track', album: 'opus-11', vol: 21, track: 1, title: 'Ho’oponopono: Explanation', by: ['justin'], voice: 'justin', occasion: ['text'], access: 'price', price: 3.99, year: 2007, rel: { companion: ['t-hooponopono-2'] },
      blurb: 'Ho’oponopono explained. The experience follows on the next track.' },
    { id: 't-hooponopono-2', kind: 'track', album: 'opus-11', vol: 21, track: 2, title: 'Ho’oponopono: Experience', by: ['justin', 'cannaday'], voice: 'justin', occasion: ['healing'], access: 'price', price: 3.99, year: 2007, rel: { companion: ['t-hooponopono-1'] },
      blurb: 'Ho’oponopono as a contemplative meditation, with music by John Cannaday.' },
    { id: 't-be-life', kind: 'track', album: 'opus-11', vol: 21, track: 3, title: 'Be Life, Share Life', by: ['justin', 'cannaday'], voice: 'justin', occasion: ['life'], access: 'price', price: 3.99, year: 2007,
      blurb: 'A contemplative meditation from the Ho’oponopono album.' },
    { id: 't-living-god', kind: 'track', album: 'opus-11', vol: 21, track: 4, title: 'Spirit of the Living God', by: ['justin', 'jeffers'], voice: 'justin', occasion: ['text'], access: 'price', price: 3.99, year: 2007,
      blurb: 'The closing contemplative meditation on Volume 21, sung by Tim Jeffers.' },
    { id: 't-creation', kind: 'track', album: 'vol-22', vol: 22, track: 1, title: 'We Are One: Creation Spirituality', by: ['justin'], voice: 'justin', occasion: ['text'], access: 'price', price: 3.99,
      blurb: 'Captures the essence of Franciscan spirituality: the Creation Model.' },
    { id: 't-peace-prayer', kind: 'track', album: 'vol-22', vol: 22, track: 2, title: 'We Are One: The Peace Prayer of St. Francis', by: ['justin'], voice: 'justin', occasion: ['text'], access: 'price', price: 3.99, rel: { companion: ['t-st-francis'] },
      blurb: 'Creation Spirituality applied to the Peace Prayer of St. Francis.' },
    { id: 't-serenity', kind: 'track', album: 'vol-22', vol: 22, track: 3, title: 'We Are One: The Serenity Prayer', by: ['justin'], voice: 'justin', occasion: ['text'], access: 'price', price: 3.99,
      blurb: 'Creation Spirituality applied to the Serenity Prayer.' },

    /* -------------------------------------------------- books and the set */
    { id: 'sfl-book', kind: 'book', title: 'Success: Full Living', sub: 'A Contemporary Approach to Responsible Spirituality', by: ['justin'], voice: 'justin', occasion: ['life'], access: 'price', price: 15, thick: 3, rel: { partOf: ['trilogy'], form: ['sfl-album', 'sfl-series', 'sfl-program'] },
      blurb: 'The first volume of the Success trilogy, and the book behind Justin’s flagship program. Also an e-book.' },
    { id: 'sfr-book', kind: 'book', title: 'Success: Full Relating', sub: 'Spirituality for the 21st Century and Beyond', by: ['justin'], voice: 'justin', occasion: ['life'], access: 'price', price: 15, thick: 2, rel: { partOf: ['trilogy'] },
      blurb: 'The second volume: the same principles turned toward the people in our lives.' },
    { id: 'sft-book', kind: 'book', title: 'Success: Full Thinking', sub: 'Tapping into the Unlimited Resources of the Mind', by: ['justin'], voice: 'justin', occasion: ['life'], access: 'price', price: 15, thick: 1, rel: { partOf: ['trilogy'] },
      blurb: 'The third volume, on the unlimited resources of the mind.' },
    { id: 'trilogy', kind: 'set', title: 'The Success Trilogy', sub: 'Three books', count: 3, by: ['justin'], voice: 'justin', occasion: ['life'], access: 'price', price: 40,
      blurb: 'Full Living, Full Relating and Full Thinking together. The books have been read in French, Portuguese, Polish, Hungarian, German, Russian and Greek.' },
    { id: 'rohr-book', kind: 'book', title: 'The Universal Christ', sub: 'Richard Rohr', by: ['rohr'], voice: 'together', occasion: ['text', 'together'], access: 'elsewhere', thick: 2,
      blurb: 'Richard Rohr’s book on Christ as present in all things: in creation, in one another, and in our own lived experience. The Hermitage read it together in spring 2026.' },

    /* ----------------------------------------------------- Justin on video */
    { id: 'v-intro', kind: 'video', title: 'An introduction to the Hermitage', by: ['justin'], voice: 'justin', occasion: ['beginning'], access: 'soon', rel: { partOf: ['teaching-series'] },
      blurb: 'Friar Justin introduces the Hermitage. One of the first three videos being cleaned and titled for the library.' },
    { id: 'v-goals', kind: 'video', title: 'Justin’s goals, for him and for us', by: ['justin'], voice: 'justin', occasion: ['life'], access: 'soon', rel: { partOf: ['teaching-series'] },
      blurb: 'Friar Justin on what he hoped for, for himself and for the people who practice with the Hermitage.' },
    { id: 'v-prayer', kind: 'video', title: 'A spiritual progression through prayer', by: ['justin'], voice: 'justin', occasion: ['text'], access: 'soon', rel: { partOf: ['teaching-series'], form: ['prayer-of-quiet'] },
      blurb: 'The path Justin taught from spoken prayer, to mental prayer, to the prayer of silence.' },
    { id: 'homilies', kind: 'series', title: 'Sunday homilies', sub: 'About 17 hours', hours: 17, by: ['justin'], voice: 'justin', occasion: ['text'], access: 'soon',
      blurb: 'Friar Justin’s Sunday homilies, being cleaned, titled and chaptered. Transcripts will make every one of them searchable.' },
    { id: 'teaching-series', kind: 'series', title: 'Teaching series', sub: 'About 7–8 hours', hours: 7.5, by: ['justin'], voice: 'justin', occasion: ['life'], access: 'soon',
      blurb: 'Justin’s recorded teaching series, Success: Full Living among them.' },
    { id: 'sfl-series', kind: 'video', title: 'Success: Full Living, the teaching series', by: ['justin'], voice: 'justin', occasion: ['life'], access: 'soon', rel: { partOf: ['teaching-series'], form: ['sfl-book', 'sfl-album', 'sfl-program'] },
      blurb: 'The program as Justin taught it on video: the mechanism of a full life, meditation, and spirituality.' },

    /* ------------------------------------------------ programs and circles */
    { id: 'train-your-mind', kind: 'program', title: 'Train Your Mind', sub: 'Meditation Foundations', by: ['samuel'], voice: 'community', occasion: ['beginning', 'together'], access: 'soon', lessons: 8, href: 'programs/train-your-mind/',
      blurb: 'A rotating class that explores meditation through modern science and ancient contemplative wisdom, in two phases of four classes. No experience needed, and no tradition required.' },
    { id: 'sfl-program', kind: 'program', title: 'Success: Full Living', sub: 'The flagship program', by: ['justin'], voice: 'justin', occasion: ['life', 'together'], access: 'soon', lessons: 3, href: 'programs/success-full-living/', rel: { form: ['sfl-book', 'sfl-album', 'sfl-series'] },
      blurb: 'Practical tools for managing a life, joined to meditation and direct spirituality, and named for the promise of life “to the full.”' },
    { id: 'prayer-of-quiet', kind: 'program', title: 'Living the Prayer of Quiet', sub: 'The capstone retreat', by: ['justin'], voice: 'justin', occasion: ['text'], access: 'soon', lessons: 3, href: 'programs/prayer-of-quiet/',
      blurb: 'The retreat that carries Justin’s teaching to its quietest point: from spoken prayer, to mental prayer, to the prayer of silence.' },
    { id: 'deep-peace', kind: 'program', title: 'The Day of Deep Peace', sub: 'A day of silence, twice a year', by: ['samuel'], voice: 'community', occasion: ['together', 'beginning'], access: 'soon', lessons: 1,
      blurb: 'A full day of noble silence, meditation guidance for beginners and experienced practitioners, mindful walking, a contemplative parable and shared meals. “This is not a lecture. It is a return.”' },
    { id: 'universal-christ-circle', kind: 'circle', title: 'The Universal Christ, read together', sub: 'Eight sessions · spring 2026', sessions: 8, by: ['peggy', 'samuel'], voice: 'together', occasion: ['together', 'text'], access: 'free', year: 2026, rel: { reads: ['rohr-book'] },
      blurb: 'Eight Thursday evenings, March 19 to May 21, in person at the Hermitage, with the book’s companion guide for group reflection. Facilitated by Peggy Alderman and Samuel.' }
  ];

  // Ordered paths through the library. Notes are drawn from the catalog's
  // own descriptions; who lays each path is for Samuel to confirm.
  var PATHS = [
    { id: 'first-week', title: 'A first week of meditation', by: 'Suggested by the Hermitage', time: '5 recordings, then a class',
      desc: 'For someone who has never meditated, or stopped a long time ago. Relax first, then keep the day’s two ends.',
      stops: [
        ['t-relaxation', 'Start here, especially if relaxing doesn’t come easily.'],
        ['t-universal-am', 'Made for people of any faith. Light stands for God.'],
        ['t-universal-pm', 'Its evening companion. Keep both ends of the day.'],
        ['t-contemplative-am', 'When you are ready to be led less and to rest more.'],
        ['train-your-mind', 'When you want to practice with others, and know why it works.']
      ] },
    { id: 'hard-season', title: 'Through a hard season', by: 'Suggested by the Hermitage', time: '6 recordings',
      desc: 'For illness, grief, or a difficult person: your own healing first, then the people around you.',
      stops: [
        ['t-healing-self', 'For whatever is unwell: body, mind, feeling or spirit.'],
        ['t-healing-others-1', 'If it is someone you love who is ill.'],
        ['t-relationships-1', 'For the person who is hardest to be with.'],
        ['t-self-image', 'How the picture we carry of ourselves is made.'],
        ['t-affirmations', 'And how to begin remaking it.'],
        ['t-peace-1', 'Widening out: peace, at the largest scale.']
      ] },
    { id: 'praying-text', title: 'Praying with a text', by: 'Suggested by the Hermitage', time: '7 recordings, then a retreat',
      desc: 'Justin taught that any familiar text, scripture, poem or prayer can become a meditation. These follow his path from spoken prayer toward silence.',
      stops: [
        ['t-st-francis', 'The first example: a prayer many people already know.'],
        ['t-lords-prayer', 'The second: the prayer Jesus taught.'],
        ['t-psalm-23', 'The same way of listening, with a psalm.'],
        ['t-canticle', 'And with St. Francis’s praise of creation.'],
        ['t-creation', 'The heart of Franciscan spirituality: the Creation Model.'],
        ['t-serenity', 'Creation Spirituality brought to a prayer for everyday life.'],
        ['prayer-of-quiet', 'Where the path ends: the prayer of silence.']
      ] },
    { id: 'sfl-four-ways', title: 'Success: Full Living, four ways', by: 'Suggested by the Hermitage', time: 'A book, an album, a series, a program',
      desc: 'Justin’s flagship teaching comes in four forms. Take the one that fits how you learn, or all four in turn.',
      stops: [
        ['sfl-book', 'To read at your own pace.'],
        ['sfl-album', 'As a mini-retreat at home, on three discs.'],
        ['sfl-series', 'To hear Justin teach it himself.'],
        ['sfl-program', 'To work through it with others.']
      ] }
  ];

  window.HWCatalog = { people: PEOPLE, occasions: OCCASIONS, glass: GLASS, items: ITEMS, paths: PATHS };
})();
