/* Research library for the principal dashboard.
   Culture-and-climate cards, each tied to a pattern the boards can show. A "What the research says" notice
   reads the board's own rows (same date range, grade chips, and filters) and points at the card that fits.
   Cards summarize published studies in plain language and say what kind of study each one was. Practice
   advice that has little direct research behind it is labeled as practice, not as science.
   window.PPR = { CARDS, TAGS, EVIDENCE, RULES, card, notices }. */
(function () {
  const EVIDENCE = {
    strong: "Strong evidence: several trials or reviews",
    promising: "Promising: studies point the same way, but designs vary",
    practitioner: "Common practice: widely used, little direct research",
  };

  const CARDS = [
    {
      id: "belonging", short: "Make sure every student is known", tag: "Belonging", evidence: "promising",
      title: "Make sure every student is known by an adult",
      tagline: "Feeling like you belong at school goes with better attendance, effort and well-being.",
      signal: "Many repeat visitors, students arriving blue or lonely, or serious feeling words.",
      says: [
        "A review of 51 studies found that students who felt they belonged did better on engagement and well-being. Teacher support mattered most (Allen et al., 2018).",
        "In one study of middle schoolers, a stronger sense of belonging went with more effort and motivation (Goodenow, 1993). It shows a link, not a cause.",
        "Relationship mapping is a simple practice schools use to find students no adult knows well (Making Caring Common, Harvard).",
      ],
      tryThis: [
        "At a staff meeting, list every student and have each adult mark the ones they know well. Give each unmarked student a named adult this month.",
        "Start with the most frequent visitors on the Support board.",
        "Greet one student by name each day and ask about something they told you before.",
      ],
      sources: [
        { t: "Allen, K., Kern, M. L., Vella-Brodrick, D., Hattie, J., & Waters, L. (2018). What schools need to know about fostering school belonging: A meta-analysis. Educational Psychology Review, 30(1), 1–34." },
        { t: "Goodenow, C. (1993). The psychological sense of school membership among adolescents: Scale development and educational correlates. Psychology in the Schools, 30(1), 79–90." },
        { t: "Making Caring Common Project, Harvard Graduate School of Education. Relationship Mapping Strategy.", u: "https://mcc.gse.harvard.edu/resources-for-educators/relationship-mapping-strategy" },
      ],
    },
    {
      id: "relationships", short: "Greet students at the door", tag: "Teacher–student relationships", evidence: "promising",
      title: "Greet students at the door",
      tagline: "Warm, predictable classrooms start in the first two minutes.",
      signal: "Many visits are sent by staff, students say what happened involved class, or classrooms are where incidents happen.",
      says: [
        "Across 99 studies, better teacher–student relationships went with more engagement and somewhat better achievement. The link was stronger in the older grades (Roorda et al., 2011).",
        "In small studies in middle school classrooms, greeting each student at the door and giving a quick reminder of what's expected raised time on task by about 20 percentage points and cut disruptions by about 9 (Cook et al., 2018).",
        "Teacher relationships in kindergarten predicted behavior and grades through eighth grade (Hamre & Pianta, 2001).",
      ],
      tryThis: [
        "Ask teachers to greet students at the door by name for two weeks.",
        "Offer to cover a class so a teacher can watch a colleague's first five minutes.",
        "Many schools aim for several kind words for every correction. This is common practice, not a proven ratio. Try noticing the good first.",
      ],
      sources: [
        { t: "Roorda, D. L., Koomen, H. M. Y., Spilt, J. L., & Oort, F. J. (2011). The influence of affective teacher–student relationships on students' school engagement and achievement: A meta-analytic approach. Review of Educational Research, 81(4), 493–529." },
        { t: "Cook, C. R., Fiat, A., Larson, M., Daikos, C., Slemrod, T., Holland, E. A., Thayer, A. J., & Renshaw, T. (2018). Positive Greetings at the Door: Evaluation of a low-cost, high-yield proactive classroom management strategy. Journal of Positive Behavior Interventions, 20(3), 149–159." },
        { t: "Hamre, B. K., & Pianta, R. C. (2001). Early teacher–child relationships and the trajectory of children's school outcomes through eighth grade. Child Development, 72(2), 625–638." },
      ],
    },
    {
      id: "discipline", short: "Lead with understanding", tag: "Discipline", evidence: "promising",
      title: "Lead with understanding when a student is defiant",
      tagline: "How adults think about misbehavior can change how often students are sent out.",
      signal: "Many staff-sent visits are for defiance, or one hour or class sends most of them.",
      says: [
        "In a randomized study of five middle schools, a short online exercise that helped teachers see discipline through a student's eyes cut suspensions in half, from 9.6% to 4.8% (Okonofua et al., 2016).",
        "Defiance and disrespect depend most on an adult's judgment. They are also where unfair gaps between groups of students most often show up (Skiba et al., 2002).",
        "Restorative practices went with better teacher–student relationships when schools did them well (Gregory et al., 2016). That study shows a link, not a cause.",
      ],
      tryThis: [
        "Before the consequence, ask: What's going on for this student?",
        "Look at Defiance on the Why students come chart by hour, and talk with the team privately about patterns.",
        "Plan a two-minute talk when the student comes back: what happened, and what now. The study used a specific online exercise, so a staff talk is a fair start but not the same thing.",
      ],
      sources: [
        { t: "Okonofua, J. A., Paunesku, D., & Walton, G. M. (2016). Brief intervention to encourage empathic discipline cuts suspension rates in half among adolescents. Proceedings of the National Academy of Sciences, 113(19), 5221–5226." },
        { t: "Skiba, R. J., Michael, R. S., Nardo, A. C., & Peterson, R. L. (2002). The color of discipline: Sources of racial and gender disproportionality in school punishment. The Urban Review, 34(4), 317–342." },
        { t: "Gregory, A., Clawson, K., Davis, A., & Gerewitz, J. (2016). The promise of restorative practices to transform teacher–student relationships and achieve equity in school discipline. Journal of Educational and Psychological Consultation, 26(4), 325–353." },
      ],
    },
    {
      id: "restorative", short: "Repair harm with restorative talks", tag: "Restorative practices", evidence: "promising",
      title: "Repair harm between students",
      tagline: "Ask who was affected and what would make it right, soon after it happens.",
      signal: "Reports of unkind, physical or threatening behavior, or the same names more than once.",
      says: [
        "In a randomized study across 44 Pittsburgh schools, restorative practices reduced suspensions and improved teachers' views of school climate. Test scores did not improve. In middle schools the results were weaker and may have been worse, so how well it's done matters (Augustine et al., 2018).",
        "In a survey of high school students, students were more willing to ask for help when they saw adults as fair and supportive (Eliot et al., 2010).",
      ],
      tryThis: [
        "After each peer incident ask: What happened? Who was affected? What would make it right?",
        "Hold that talk within two school days, and tell the student who reported what happened next.",
        "Practice circles in advisory first, so they feel normal before they're needed.",
      ],
      sources: [
        { t: "Augustine, C. H., Engberg, J., Grimm, G. E., Lee, E., Wang, E. L., Christianson, K., & Joseph, A. A. (2018). Can restorative practices improve school climate and curb suspensions? An evaluation of the impact of restorative practices in a mid-sized urban school district. RAND Corporation." },
        { t: "Eliot, M., Cornell, D., Gregory, A., & Fan, X. (2010). Supportive school climate and student willingness to seek help for bullying and threats of violence. Journal of School Psychology, 48(6), 533–553." },
        { t: "International Institute for Restorative Practices.", u: "https://www.iirp.edu" },
      ],
    },
    {
      id: "supervision", short: "Put adults where incidents happen", tag: "Unstructured time", evidence: "promising",
      title: "Put adults where incidents happen",
      tagline: "Move, scan and talk with students in halls, the cafeteria, the bus line and bathrooms.",
      signal: "Incidents cluster in halls, the cafeteria, the bus, bathrooms or outside, or at lunch, recess or passing time.",
      says: [
        "In small school studies, adults who moved around, watched the whole area and chatted with students, plus a quick reminder before busy times, reduced problem behavior in hallways, at recess and in a sixth-grade class (Colvin et al., 1997; Lewis et al., 2000; De Pry & Sugai, 2002).",
        "A review of 44 programs found that better playground supervision was one of the parts linked to bigger drops in bullying (Ttofi & Farrington, 2011).",
        "School-wide positive behavior supports, which include teaching and supervising expectations in common areas, cut office referrals and suspensions in a randomized study of 37 elementary schools (Bradshaw et al., 2010).",
      ],
      tryThis: [
        "Use the Where and when chart to pick two hot spots, and assign a named adult to each.",
        "Give a 30-second reminder of expectations right before lunch or passing time.",
        "Check the chart again in four weeks. If the hot spot moved, move the adults.",
      ],
      sources: [
        { t: "Colvin, G., Sugai, G., Good, R. H., & Lee, Y. (1997). Using active supervision and precorrection to improve transition behaviors in an elementary school. School Psychology Quarterly, 12(4), 344–363." },
        { t: "Lewis, T. J., Colvin, G., & Sugai, G. (2000). The effects of pre-correction and active supervision on the recess behavior of elementary students. Education and Treatment of Children, 23(2), 109–121." },
        { t: "De Pry, R. L., & Sugai, G. (2002). The effect of active supervision and pre-correction on minor behavioral incidents in a sixth grade general education classroom. Journal of Behavioral Education, 11(4), 255–267." },
        { t: "Ttofi, M. M., & Farrington, D. P. (2011). Effectiveness of school-based programs to reduce bullying: A systematic and meta-analytic review. Journal of Experimental Criminology, 7(1), 27–56." },
        { t: "Bradshaw, C. P., Mitchell, M. M., & Leaf, P. J. (2010). Examining the effects of schoolwide positive behavioral interventions and supports on student outcomes. Journal of Positive Behavior Interventions, 12(3), 133–148." },
      ],
    },
    {
      id: "bullying", short: "Respond to bullying school-wide", tag: "Bullying prevention", evidence: "strong",
      title: "Respond to bullying and online harm as a whole school",
      tagline: "Programs work best when families, supervision, clear rules and follow-through move together.",
      signal: "Threats, unkind behavior that repeats, or anything that happened online.",
      says: [
        "Reviews of school anti-bullying programs find bullying drops by about one-fifth on average (Ttofi & Farrington, 2011; Gaffney et al., 2019). Results are usually smaller in North America and in the strongest trials, so expect less.",
        "Parts linked to better results: parent meetings, supervision of hot spots, clear classroom rules, and firm, consistent responses (Ttofi & Farrington, 2011).",
        "In a survey of high school students, students in schools that were both supportive and structured were more willing to seek help for bullying (Eliot et al., 2010).",
      ],
      tryThis: [
        "Keep the report button working: always tell the reporting student what happened next.",
        "Send families a short note each fall and spring about online harm and your response steps.",
        "Teach bystander moves in advisory: name it, support the person, tell an adult.",
      ],
      sources: [
        { t: "Ttofi, M. M., & Farrington, D. P. (2011). Effectiveness of school-based programs to reduce bullying: A systematic and meta-analytic review. Journal of Experimental Criminology, 7(1), 27–56." },
        { t: "Gaffney, H., Ttofi, M. M., & Farrington, D. P. (2019). Evaluating the effectiveness of school-bullying prevention programs: An updated meta-analytical review. Aggression and Violent Behavior, 45, 111–133." },
        { t: "Eliot, M., Cornell, D., Gregory, A., & Fan, X. (2010). Supportive school climate and student willingness to seek help for bullying and threats of violence. Journal of School Psychology, 48(6), 533–553." },
      ],
    },
    {
      id: "regulation", short: "Teach the feeling words", tag: "Emotion regulation", evidence: "strong",
      title: "Teach the feeling words and the calming strategies",
      tagline: "Students use the strategies they've practiced. The Pride Center can speak the same language as classrooms.",
      signal: "Most arrivals are red or blue, students don't leave green or yellow, or the same words come up every day.",
      says: [
        "Across 213 school programs that teach social and emotional skills, students gained about 11 percentile points in achievement and had fewer behavior problems and less distress (Durlak et al., 2011). Gains were still there months to years later (Taylor et al., 2017).",
        "RULER, the approach behind the Mood Meter, improved students' social and emotional skills and year-end grades (Brackett et al., 2012). It also made classrooms feel better in a randomized trial (Rivers et al., 2013).",
        "A calming strategy works best when students practiced it earlier, in calm moments. That is common teaching advice, not a tested finding.",
      ],
      tryThis: [
        "Use the same four colors and feeling words in every classroom, with a quick check-in at the start of advisory.",
        "Look at the What helped chart and practice the top three strategies in advisory.",
        "When one student keeps ending red or blue, talk with the counselor instead of lengthening visits.",
      ],
      sources: [
        { t: "Durlak, J. A., Weissberg, R. P., Dymnicki, A. B., Taylor, R. D., & Schellinger, K. B. (2011). The impact of enhancing students' social and emotional learning: A meta-analysis of school-based universal interventions. Child Development, 82(1), 405–432." },
        { t: "Taylor, R. D., Oberle, E., Durlak, J. A., & Weissberg, R. P. (2017). Promoting positive youth development through school-based social and emotional learning interventions: A meta-analysis of follow-up effects. Child Development, 88(4), 1156–1171." },
        { t: "Brackett, M. A., Rivers, S. E., Reyes, M. R., & Salovey, P. (2012). Enhancing academic performance and social and emotional competence with the RULER feeling words curriculum. Learning and Individual Differences, 22(2), 218–224." },
        { t: "Rivers, S. E., Brackett, M. A., Reyes, M. R., Elbertson, N. A., & Salovey, P. (2013). Improving the social and emotional climate of classrooms: A clustered randomized controlled trial testing the RULER approach. Prevention Science, 14(1), 77–87." },
        { t: "RULER, Yale Center for Emotional Intelligence.", u: "https://www.rulerapproach.org" },
      ],
    },
    {
      id: "peers", short: "Help students build friendships", tag: "Friendships", evidence: "promising",
      title: "Help students build friendships on purpose",
      tagline: "Friends and peer conflicts shape how much students like school.",
      signal: "Many students say what happened involved a friend, or arrive feeling lonely.",
      says: [
        "Reviews of cooperative learning, where students work toward a shared goal and each person's part matters, link it to better relationships among students, including across groups (Johnson & Johnson, 2009).",
        "Schools also use lunch groups, peer buddies and advisory games to help students connect. These are widely used, with little direct research.",
      ],
      tryThis: [
        "Add one cooperative task a week in advisory where every student has a job.",
        "Start a lunch group for students who often arrive lonely, led by a friendly adult.",
        "Pair new or quiet students with a peer buddy at the start of the year or after a move.",
      ],
      sources: [
        { t: "Johnson, D. W., & Johnson, R. T. (2009). An educational psychology success story: Social interdependence theory and cooperative learning. Educational Researcher, 38(5), 365–379." },
      ],
    },
    {
      id: "mornings", short: "Give mornings a soft landing", tag: "Routines", evidence: "practitioner",
      title: "Give mornings a soft landing",
      tagline: "You can't change what happened at home, but you can shape the first fifteen minutes.",
      signal: "Visits bunch before 10 a.m. or on Mondays, or many students say it was about home.",
      says: [
        "Responsive Classroom, which starts the day with a morning meeting and steady routines, improved math and reading in a three-year randomized trial in elementary schools (Rimm-Kaufman et al., 2014).",
        "Teens' body clocks run late. The American Academy of Pediatrics recommends that middle and high schools start no earlier than 8:30 a.m., because short sleep goes with mood and attention problems (AAP, 2014).",
        "Starting with a calm, predictable adult helps students who arrive upset. That is common practice, not a tested finding.",
      ],
      tryThis: [
        "Open a quiet spot before first hour with a friendly adult, and ask no questions for the first ten minutes.",
        "Start first hour with a two-minute check-in (a color and one word) before content.",
        "If visits cluster at one hour, walk the building then for a week and watch what happens right before.",
      ],
      sources: [
        { t: "Rimm-Kaufman, S. E., Larsen, R. A. A., Baroody, A. E., Curby, T. W., Ko, M., Thomas, J. B., Merritt, E. G., Abry, T., & DeCoster, J. (2014). Efficacy of the Responsive Classroom approach: Results from a 3-year, longitudinal randomized controlled trial. American Educational Research Journal, 51(3), 567–603." },
        { t: "American Academy of Pediatrics, Adolescent Sleep Working Group (2014). School start times for adolescents. Pediatrics, 134(3), 642–649." },
      ],
    },
    {
      id: "basicNeeds", short: "Meet basic needs first", tag: "Basic needs", evidence: "promising",
      title: "Meet basic needs first",
      tagline: "A hungry or cold student isn't ready to practice calming strategies or learn algebra.",
      signal: "Requests for food, hygiene items, clothing or supplies, or visits around breakfast and lunch.",
      says: [
        "In a study of children in kindergarten through third grade, food insecurity went with weaker reading and math gains and weaker social skills, after adjusting for family differences (Jyoti et al., 2005).",
        "Schools that bring food, health and family supports into the building often see better attendance and behavior when the supports are well connected. The research is still growing and mostly promising (Maier et al., 2017).",
      ],
      tryThis: [
        "Keep the supply closet stocked and private, with no forms in front of other students.",
        "Watch the Basic needs chart monthly and order ahead of the pattern, such as period products, chargers and winter clothing.",
        "Share trends, never names, with the PTO or a community partner and ask for a standing supply. If food leads, ask food service about breakfast after the bell.",
      ],
      sources: [
        { t: "Jyoti, D. F., Frongillo, E. A., & Jones, S. J. (2005). Food insecurity affects school children's academic performance, weight gain, and social skills. Journal of Nutrition, 135(12), 2831–2839." },
        { t: "Maier, A., Daniel, J., Oakes, J., & Lam, L. (2017). Community schools as an effective school improvement strategy: A review of the evidence. Learning Policy Institute." },
      ],
    },
    {
      id: "cico", short: "Start Check-In/Check-Out", tag: "Extra support", evidence: "promising",
      title: "A few students make most visits: try Check-In/Check-Out",
      tagline: "Frequent visits are information, not a verdict. Use them to notice who needs more support early.",
      signal: "A few students make up a big share of visits, or the same names arrive red or blue week after week.",
      says: [
        "Check-In/Check-Out gives a student a morning check-in with a chosen adult, a daily progress card and an afternoon check-out. Reviews find it reduces problem behavior for many students, but most studies are small single-case studies (Hawken et al., 2014; Maggin et al., 2015).",
        "It seems to help most when a student wants adult attention, which is often what frequent visitors are after. That is a common reading of the research, not a firm finding.",
      ],
      tryThis: [
        "Use the Most visits table as a screening list and review it every two weeks with the counselor.",
        "Start with three to five students, one check-in adult each, and three expectations on the card.",
        "Ask the student what they want from the visits and write it on the plan. After four good weeks, move to self-monitoring.",
      ],
      sources: [
        { t: "Hawken, L. S., Bundock, K., Kladis, K., O'Keeffe, B., & Barrett, C. A. (2014). Systematic review of the Check-in, Check-out intervention for students at risk for emotional and behavioral disorders. Education and Treatment of Children, 37(4), 635–658." },
        { t: "Maggin, D. M., Zurheide, J., Pickett, K. C., & Baillie, S. J. (2015). A systematic evidence review of the Check-in/Check-out program for reducing student challenging behaviors. Journal of Positive Behavior Interventions, 17(4), 197–208." },
        { t: "Center on PBIS.", u: "https://www.pbis.org" },
      ],
    },
    {
      id: "followUp", short: "Close the loop quickly", tag: "Follow-up", evidence: "practitioner",
      title: "Close the loop quickly",
      tagline: "Students report more when they see something happen next.",
      signal: "Reports still open after a few days, or follow-up taking longer than three days.",
      says: [
        "In a survey of high school students, students were more willing to ask for help with bullying and threats when they saw adults as both supportive and fair (Eliot et al., 2010).",
        "Schools that were both strict and supportive had less risk behavior and less victimization in a survey of high school students (Cornell & Huang, 2016).",
        "No study tested how fast follow-up should be. The two-day target below is common practice.",
      ],
      tryThis: [
        "Aim to talk with the reporting student within two school days, even if the full follow-up takes longer.",
        "Tell them what happened next in words they could repeat to a friend.",
        "Check Still needing follow-up every Monday, and give anything older than three days a named owner.",
      ],
      sources: [
        { t: "Eliot, M., Cornell, D., Gregory, A., & Fan, X. (2010). Supportive school climate and student willingness to seek help for bullying and threats of violence. Journal of School Psychology, 48(6), 533–553." },
        { t: "Cornell, D., & Huang, F. (2016). Authoritative school climate and high school student risk behavior: A cross-sectional multi-level analysis of student self-reports. Journal of Youth and Adolescence, 45(11), 2246–2259." },
      ],
    },
    {
      id: "voice", short: "Bring students into the data", tag: "Student voice", evidence: "practitioner",
      title: "Bring students into the data",
      tagline: "When students come in on their own, that's a sign of trust. When most visits are staff-sent, the room may not feel like theirs yet.",
      signal: "Few students come on their own, most visits are staff-sent, or many students type their own feeling word.",
      says: [
        "Schools that involve students in finding problems and shaping solutions can build students' sense of belonging and ownership. One case study of a high school describes this (Mitra, 2004). It is a case study, not a trial.",
        "A positive school climate, including students feeling heard, goes with better achievement and fewer behavior problems in a review of research (Thapa et al., 2013).",
      ],
      tryThis: [
        "Meet monthly with a small student group to look at these charts (no names) and suggest one change.",
        "Let students help name and redesign the calming stations. The words they type are a free vocabulary survey.",
        "Ask departing eighth graders what would have made them come in sooner, and share one change each quarter.",
      ],
      sources: [
        { t: "Mitra, D. L. (2004). The significance of students: Can increasing \"student voice\" in schools lead to gains in youth development? Teachers College Record, 106(4), 651–688." },
        { t: "Thapa, A., Cohen, J., Guffey, S., & Higgins-D'Alessandro, A. (2013). A review of school climate research. Review of Educational Research, 83(3), 357–385." },
      ],
    },
    {
      id: "pbis", short: "Re-teach school-wide expectations", tag: "School-wide systems", evidence: "strong",
      title: "Teach and recognize expectations school-wide",
      tagline: "Three to five expectations, taught in each place, praised more than corrected, and steered by data.",
      signal: "Incident reports are rising, or spread across many places and periods.",
      says: [
        "School-wide PBIS reduced office referrals and suspensions in a randomized trial of 37 elementary schools (Bradshaw et al., 2010). Schools' safety ratings improved in another trial (Horner et al., 2009). Both trials were in elementary schools.",
        "The basic parts are plain: a few clear expectations, taught in each setting, praise for meeting them, and data (like this dashboard) to decide where to focus.",
      ],
      tryThis: [
        "Re-teach expectations after each long break, in the places where incidents happen.",
        "Make praise specific and frequent. Many schools aim for four or five praise comments per correction. That is common practice, not a proven ratio.",
        "Bring the Reports by week chart to your monthly PBIS meeting and pick one place to focus on for the next month.",
      ],
      sources: [
        { t: "Bradshaw, C. P., Mitchell, M. M., & Leaf, P. J. (2010). Examining the effects of schoolwide positive behavioral interventions and supports on student outcomes. Journal of Positive Behavior Interventions, 12(3), 133–148." },
        { t: "Horner, R. H., Sugai, G., Smolkowski, K., Eber, L., Nakasato, J., Todd, A. W., & Esperanza, J. (2009). A randomized, wait-list controlled effectiveness trial assessing school-wide positive behavior support in elementary schools. Journal of Positive Behavior Interventions, 11(3), 133–144." },
        { t: "Center on PBIS.", u: "https://www.pbis.org" },
      ],
    },
  ];
  const BY_ID = {}; CARDS.forEach(c => { BY_ID[c.id] = c; });
  const TAGS = [...new Set(CARDS.map(c => c.tag))];

  // ---------- Notices: rules that read the board's rows ----------
  // Sentences stay short and plain. They never quote a student's own words, and they say "a few" instead of a number under 5,
  // so a notice shown on a projector can't point at one child.
  const pct = (n, d) => d ? Math.round(100 * n / d) : 0;
  const count = (rows, f) => rows.filter(f).length;
  const topOf = (rows, key) => { const m = new Map(); rows.forEach(r => { const k = key(r); if (k) m.set(k, (m.get(k) || 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const inTen = s => Math.max(1, Math.round(s * 10));
  const OUTSIDE_CLASS = /hallway|cafeteria|bus|outside|gym|bathroom|stairwell|library/i;
  const PEER = /mean|hit|push|threat|touch/i;
  const DAY = 86400000;
  // Each rule: the boards it applies to, the card it points at, and run(visits, incidents, now) returning
  // { score, noticed } when the pattern is there. score 1 = right at the threshold; it is capped at 3 and weighted so
  // no one rule always wins. weight < 1 marks rules that describe how the room normally works.
  const RULES = [
    { id: "hardArrivals", weight: 0.7, boards: ["overview", "support"], card: "regulation", run(v) {
      if (v.length < 20) return null; const n = count(v, r => r.arrivedHard), s = n / v.length; if (s < .7) return null;
      const hard = v.filter(r => r.arrivedHard && r.improved !== null), better = hard.length >= 10 ? pct(count(hard, r => r.improved), hard.length) : null;
      return { score: s / .7, noticed: `Most visits start tough (${pct(n, v.length)}%).${better != null ? ` ${better}% of those students leave better.` : ""}` }; } },
    { id: "lowRecovery", boards: ["overview", "support"], card: "regulation", run(v) {
      const hard = v.filter(r => r.arrivedHard && r.improved !== null); if (hard.length < 15) return null;
      const ok = count(hard, r => r.improved), s = ok / hard.length; if (s >= .6) return null;
      return { score: .6 / Math.max(s, .05), noticed: `Only ${pct(ok, hard.length)}% of students who arrive red or blue leave green or yellow.` }; } },
    { id: "blueArrivals", boards: ["overview", "support"], card: "belonging", run(v) {
      if (v.length < 20) return null; const n = count(v, r => r.moodIn === "Blue"), s = n / v.length; if (s < .35) return null;
      return { score: s / .35, noticed: `${pct(n, v.length)}% of visits start blue: tired, sad, lonely or down.` }; } },
    { id: "alerts", boards: ["overview", "support"], card: "belonging", run(v) {
      if (v.length < 20) return null; const n = count(v, r => r.alert); if (n < 3 || n / v.length < .04) return null;
      return { score: (n / v.length) / .04, noticed: `${n < 5 ? "A few visits" : plural(n, "visit")} started with a serious word. Check in with your counselor, privately.` }; } },
    { id: "teacherContext", boards: ["overview"], card: "relationships", run(v) {
      const w = v.filter(r => r.happened); if (w.length < 20) return null; const n = count(w, r => /teacher/i.test(r.happened)), s = n / w.length; if (s < .3) return null;
      return { score: s / .3, noticed: `About ${inTen(s)} in 10 said what happened involved class.` }; } },
    { id: "friendContext", boards: ["overview"], card: "peers", run(v) {
      const w = v.filter(r => r.happened); if (w.length < 20) return null; const n = count(w, r => /friend/i.test(r.happened)), s = n / w.length; if (s < .3) return null;
      return { score: s / .3, noticed: `About ${inTen(s)} in 10 said what happened involved a friend.` }; } },
    { id: "lonely", boards: ["overview", "support"], card: "peers", run(v) {
      if (v.length < 30) return null; const n = count(v, r => /lonely/i.test(r.wordIn)), s = n / v.length; if (n < 5 || s < .06) return null;
      return { score: s / .06, noticed: `Some students arrive feeling lonely (${pct(n, v.length)}% of visits).` }; } },
    { id: "homeContext", boards: ["overview"], card: "mornings", run(v) {
      const w = v.filter(r => r.happened); if (w.length < 20) return null; const n = count(w, r => /home/i.test(r.happened)), s = n / w.length; if (s < .3) return null;
      return { score: s / .3, noticed: `About ${inTen(s)} in 10 said what happened was at home.` }; } },
    { id: "earlyVisits", boards: ["overview"], card: "mornings", run(v) {
      if (v.length < 20) return null; const n = count(v, r => r.hour < 10), s = n / v.length; if (s < .45) return null;
      return { score: s / .45, noticed: `${pct(n, v.length)}% of visits happen before 10 a.m.` }; } },
    { id: "mondays", boards: ["overview"], card: "mornings", run(v) {
      if (v.length < 30) return null; const n = count(v, r => r.weekday === "Mon"), s = n / v.length; if (s < .3) return null;
      return { score: s / .3, noticed: `${pct(n, v.length)}% of visits fall on Mondays.` }; } },
    { id: "defiance", boards: ["overview", "incidents", "support"], card: "discipline", run(v) {
      const staff = v.filter(r => /staff/i.test(r.referral)); if (staff.length < 15) return null; const n = count(staff, r => /defian/i.test(r.reason)), s = n / staff.length; if (s < .25) return null;
      return { score: s / .25, noticed: `${pct(n, staff.length)}% of staff-sent visits were for defiance.` }; } },
    { id: "selfReferral", boards: ["overview", "support"], card: "voice", run(v) {
      if (v.length < 30) return null; const n = count(v, r => /own/i.test(r.referral)), s = n / v.length; if (s >= .4) return null;
      return { score: .4 / Math.max(s, .05), noticed: `Only ${pct(n, v.length)}% of visits are students coming in on their own.` }; } },
    { id: "trust", weight: 0.8, boards: ["overview", "support"], card: "voice", run(v) {
      if (v.length < 30) return null; const n = count(v, r => /own/i.test(r.referral)), s = n / v.length; if (s < .6) return null;
      return { score: 1.1, noticed: `${pct(n, v.length)}% of visits are students coming in on their own. That's a sign they trust the room.` }; } },
    { id: "concentration", boards: ["overview", "support"], card: "cico", run(v) {
      const top = topOf(v, r => r.student); if (top.length < 8 || v.length < 30) return null;
      const n = top.slice(0, 5).reduce((a, [, c]) => a + c, 0), s = n / v.length, expected = 5 / top.length;
      if (s < Math.max(.35, 2.2 * expected)) return null; // five of 14 students is a third by arithmetic alone
      return { score: s / Math.max(.35, 2.2 * expected), noticed: `A few students use the room often (${pct(n, v.length)}% of visits).` }; } },
    { id: "basicNeeds", boards: ["overview", "support"], card: "basicNeeds", run(v) {
      const w = v.filter(r => r.basicNeeds && r.basicNeeds.length); if (w.length < 5 || w.length / v.length < .06) return null;
      const top = topOf(w.flatMap(r => r.basicNeeds.map(n => ({ n }))), r => r.n)[0];
      return { score: (w.length / v.length) / .06, noticed: `${plural(w.length, "visit")} included a basic need${top ? `, most often ${top[0].toLowerCase()}` : ""}.` }; } },
    { id: "unstructured", boards: ["overview", "incidents"], card: "supervision", run(v, i) {
      if (i.length < 8) return null; const w = i.filter(r => OUTSIDE_CLASS.test(r.place)); const s = w.length / i.length; if (s < .5) return null; const top = topOf(w, r => r.place)[0];
      return { score: s / .5, noticed: `${pct(w.length, i.length)}% of incident reports happened outside classrooms${top ? `, most often: ${top[0]}` : ""}.` }; } },
    { id: "lunchPassing", boards: ["incidents"], card: "supervision", run(v, i) {
      if (i.length < 8) return null; const n = count(i, r => /lunch|recess|passing|before school|breakfast/i.test(r.period)), s = n / i.length; if (s < .4) return null;
      return { score: s / .4, noticed: `${pct(n, i.length)}% of incident reports come from lunch, recess, passing time or before school.` }; } },
    { id: "classroomIncidents", boards: ["incidents"], card: "relationships", run(v, i) {
      if (i.length < 8) return null; const n = count(i, r => /classroom/i.test(r.place)), s = n / i.length; if (s < .4) return null;
      return { score: s / .4, noticed: `${pct(n, i.length)}% of incident reports happened in a classroom.` }; } },
    { id: "peerHarm", boards: ["overview", "incidents"], card: "restorative", run(v, i) {
      if (i.length < 8) return null; const n = count(i, r => r.types.some(t => PEER.test(t))), s = n / i.length; if (s < .5) return null;
      return { score: s / .5, noticed: `${pct(n, i.length)}% of incident reports describe unkind, physical or threatening behavior.` }; } },
    { id: "online", boards: ["overview", "incidents"], card: "bullying", run(v, i) {
      if (i.length < 8) return null; const n = count(i, r => r.types.some(t => /online/i.test(t))), s = n / i.length; if (s < .15) return null;
      return { score: s / .15, noticed: `${pct(n, i.length)}% of incident reports involved something that happened online.` }; } },
    { id: "openIncidents", boards: ["overview", "incidents"], card: "followUp", run(v, i, now) {
      // A report filed today can't be "late" yet: only reports older than two days count.
      const old = i.filter(r => now.getTime() - r.ts.getTime() > 2 * DAY); if (old.length < 8) return null;
      const n = count(old, r => r.open), s = n / old.length, days = old.filter(r => r.daysToFollowUp !== null), avg = days.length ? days.reduce((a, r) => a + r.daysToFollowUp, 0) / days.length : 0;
      if (s < .3 && avg <= 3) return null;
      return { score: Math.max(s / .3, avg / 3), noticed: s / .3 >= avg / 3 ? `${pct(n, old.length)}% of reports older than two days still need follow-up.` : `Follow-up is taking about ${Math.round(avg)} days on average.` }; } },
    { id: "rising", boards: ["overview", "incidents"], card: "pbis", run(v, i, now) {
      if (i.length < 12) return null; const t = now.getTime(), wk = 7 * DAY;
      const recent = count(i, r => t - r.ts.getTime() <= 4 * wk && t - r.ts.getTime() >= 0), prior = count(i, r => { const d = t - r.ts.getTime(); return d > 4 * wk && d <= 8 * wk; });
      if (prior < 4 || recent < prior * 1.25) return null;
      return { score: recent / prior, noticed: `Incident reports are up: ${recent} in the last four weeks, ${prior} in the four before.` }; } },
  ];
  const DEFAULTS = { overview: "belonging", incidents: "supervision", support: "cico", all: "belonging" };

  /** Ranked notices for a board focus ("overview" | "incidents" | "support" | "all"). `now` is the end of the range being shown.
   *  Always returns at least one entry; with too little data it is a plain sentence and no card. */
  function notices(focus, rows, now) {
    now = now || new Date();
    const v = rows.visits || [], i = rows.incidents || [];
    const out = [];
    RULES.forEach(rule => {
      if (focus !== "all" && !rule.boards.includes(focus)) return;
      let r = null; try { r = rule.run(v, i, now); } catch (err) { r = null; }
      if (r) out.push({ rule: rule.id, card: BY_ID[rule.card], score: Math.min(r.score, 3) * (rule.weight || 1), noticed: r.noticed });
    });
    out.sort((a, b) => b.score - a.score);
    // One notice per card, strongest first.
    const seen = new Set(), picks = out.filter(n => !seen.has(n.card.id) && seen.add(n.card.id));
    if (!picks.length) {
      const enough = v.length + i.length >= 30;
      picks.push(enough ? { rule: null, card: BY_ID[DEFAULTS[focus] || DEFAULTS.all], score: 0, noticed: "Nothing stands out in this range." }
                        : { rule: null, card: null, score: 0, noticed: "Not enough records in this range to spot a pattern. Try a wider range." });
    }
    return picks;
  }

  window.PPR = { CARDS, TAGS, EVIDENCE, RULES, card: id => BY_ID[id] || null, notices };
})();
