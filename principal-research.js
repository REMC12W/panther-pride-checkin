/* Research library for the principal dashboard.
   Culture-and-climate cards, each tied to a pattern the boards can show. A "What the research says"
   tile reads the board's own rows (same date range, grade chips, and filters) and surfaces the card
   that fits the strongest signal. Cards cite the studies by author and year; no numbers are invented
   beyond what those papers report. window.PPR = { CARDS, TAGS, EVIDENCE, card, notices }. */
(function () {
  const EVIDENCE = {
    strong: "Strong evidence: randomized trials or meta-analyses",
    promising: "Promising evidence: several studies, mixed designs",
    practitioner: "Practitioner practice: widely used, lighter research base",
  };

  const CARDS = [
    {
      id: "belonging", short: "Make sure every student is known", tag: "Belonging", evidence: "strong",
      title: "Every student known by at least one adult",
      tagline: "Belonging is the quiet engine behind attendance, effort, and mental health.",
      signal: "Repeat visitors, students arriving blue (tired, sad, lonely, down), alert words, or \"just with myself\" as what happened.",
      says: [
        "School belonging is one of the most consistent predictors of engagement, attendance, and mental health in adolescence. In a meta-analysis of 51 studies, teacher support and students' personal characteristics were the strongest influences on belonging (Allen et al., 2018).",
        "Middle schoolers' sense of membership in their school predicts their motivation and effort beyond what friends or grades explain (Goodenow, 1993).",
        "A student who can name an adult who knows them well is less likely to drift. Relationship mapping is a low-cost way to find the students nobody has claimed (Making Caring Common, Harvard Graduate School of Education).",
      ],
      tryThis: [
        "Relationship mapping: in a staff meeting, post every student's name and have each adult mark the students they know well. Students with no marks get an adult that week.",
        "Start with the Support board: the top visitors and anyone who picked an alert word.",
        "\"2 × 10\": two minutes of non-school conversation with one student for ten school days in a row (a widely used practitioner strategy).",
        "Build one predictable touchpoint into advisory: a check-in question, a name used, a follow-up on something they shared last time.",
      ],
      sources: [
        { t: "Allen, K., Kern, M. L., Vella-Brodrick, D., Hattie, J., & Waters, L. (2018). What schools need to know about fostering school belonging: A meta-analysis. Educational Psychology Review, 30(1), 1–34." },
        { t: "Goodenow, C. (1993). The psychological sense of school membership among adolescents: Scale development and educational correlates. Psychology in the Schools, 30(1), 79–90." },
        { t: "Making Caring Common Project, Harvard Graduate School of Education. Relationship Mapping Strategy.", u: "https://mcc.gse.harvard.edu/resources-for-educators/relationship-mapping-strategy" },
      ],
    },
    {
      id: "relationships", short: "Greet students at the door", tag: "Teacher–student relationships", evidence: "strong",
      title: "Warm, predictable classrooms: greet at the door",
      tagline: "The relationship is the intervention, and the first two minutes of class are where it is built.",
      signal: "\"With my teacher\" is a common answer to what happened; the classroom is the top incident place; staff send students for defiance.",
      says: [
        "Positive teacher–student relationships are linked to higher engagement (a medium-to-large association) and to higher achievement (smaller), and the links are stronger in secondary school than in elementary (Roorda et al., 2011; meta-analysis of 99 studies).",
        "Positive Greetings at the Door, a routine of greeting each student by name with a precorrection, raised academic engaged time by about 20 percentage points and cut disruptive behavior by about 9 points in middle school classrooms (Cook et al., 2018).",
        "Early relationship quality with teachers predicts behavior and grades years later (Hamre & Pianta, 2001).",
      ],
      tryThis: [
        "Make greet-at-the-door a schoolwide routine: name, eye contact, one precorrection (\"Phones away, grab your journal\").",
        "Aim for about five positive interactions for every corrective one, especially with the students on the Support board.",
        "When one classroom shows up often behind visits, treat it as a coaching conversation, not a write-up: watch the first five minutes of class together.",
        "If \"Talking to a staff member\" tops the What helped tile, protect time for it in the schedule.",
      ],
      sources: [
        { t: "Roorda, D. L., Koomen, H. M. Y., Spilt, J. L., & Oort, F. J. (2011). The influence of affective teacher–student relationships on students' school engagement and achievement: A meta-analytic approach. Review of Educational Research, 81(4), 493–529." },
        { t: "Cook, C. R., Fiat, A., Larson, M., Daikos, C., Slemrod, T., Holland, E. A., Thayer, A. J., & Renshaw, T. (2018). Positive Greetings at the Door: Evaluation of a low-cost, high-yield proactive classroom management strategy. Journal of Positive Behavior Interventions, 20(3), 149–159." },
        { t: "Hamre, B. K., & Pianta, R. C. (2001). Early teacher–child relationships and the trajectory of children's school outcomes through eighth grade. Child Development, 72(2), 625–638." },
      ],
    },
    {
      id: "discipline", short: "Try empathic discipline", tag: "Discipline", evidence: "strong",
      title: "Defiance: lead with empathy, then with structure",
      tagline: "The most subjective referral category responds to the adult's mindset more than to the consequence.",
      signal: "Many staff-sent visits for defiance; one grade, one hour, or a few classes send most of them.",
      says: [
        "A brief online exercise that encouraged teachers to take an empathic mindset toward discipline halved year-long suspension rates among their students, from 9.6% to 4.8%, in a randomized study across five middle schools (Okonofua, Paunesku & Walton, 2016).",
        "Classrooms with stronger implementation of restorative practices had better teacher–student relationships and fewer discipline referrals for Black and Latino students (Gregory et al., 2016).",
        "Defiance and disrespect are the referral categories most open to interpretation and the ones where disproportionality usually appears (Skiba et al., 2011). Reviewing them by classroom, hour, and student is where to look first.",
      ],
      tryThis: [
        "Reframe the referral: \"What's the story behind this behavior?\" before \"What's the consequence?\"",
        "Run a short empathic-mindset session with staff; the original intervention was a brief online exercise for teachers, so it does not take a training day.",
        "Filter the Why students come tile to Defiance, then look by hour and by grade. Bring the pattern to the team it belongs to, privately.",
        "Pair every staff-sent visit with a two-minute restorative re-entry: what happened, who was affected, what happens next.",
      ],
      sources: [
        { t: "Okonofua, J. A., Paunesku, D., & Walton, G. M. (2016). Brief intervention to encourage empathic discipline cuts suspension rates in half among adolescents. Proceedings of the National Academy of Sciences, 113(19), 5221–5226." },
        { t: "Gregory, A., Clawson, K., Davis, A., & Gerewitz, J. (2016). The promise of restorative practices to transform teacher–student relationships and achieve equity in school discipline. Journal of Educational and Psychological Consultation, 26(4), 325–353." },
        { t: "Skiba, R. J., Horner, R. H., Chung, C.-G., Rausch, M. K., May, S. L., & Tobin, T. (2011). Race is not neutral: A national investigation of African American and Latino disproportionality in school discipline. School Psychology Review, 40(1), 85–107." },
      ],
    },
    {
      id: "restorative", short: "Repair harm with restorative talks", tag: "Restorative practices", evidence: "promising",
      title: "Repair harm between students with restorative practices",
      tagline: "Who was affected, and what will make it right, asked within two school days.",
      signal: "Incident reports about someone being mean, hitting or pushing, or threatening; the same names on both sides more than once.",
      says: [
        "In a randomized trial across 44 Pittsburgh schools, restorative practices reduced suspensions and improved teachers' ratings of school climate. Academic outcomes did not improve, and effects were weaker in middle schools, so implementation quality matters (Augustine et al., 2018, RAND).",
        "Restorative practices strengthen teacher–student relationships when done with fidelity (Gregory et al., 2016).",
        "Students report incidents more readily when they believe adults will respond fairly and the problem will actually be addressed (Eliot et al., 2010).",
      ],
      tryThis: [
        "Use the restorative questions after every peer incident: What happened? Who was affected? What do you need to make it right?",
        "Hold the restorative conversation within two school days of the report, and tell the reporting student what happened next.",
        "Practice circles in advisory before you need them for repair, so they are a familiar routine rather than a consequence.",
        "Track repeat pairs. The same two names in two reports calls for a planned conference with families, not another hallway talk.",
      ],
      sources: [
        { t: "Augustine, C. H., Engberg, J., Grimm, G. E., Lee, E., Wang, E. L., Christianson, K., & Joseph, A. A. (2018). Can restorative practices improve school climate and curb suspensions? An evaluation of the impact of restorative practices in a mid-sized urban school district. RAND Corporation." },
        { t: "Gregory, A., Clawson, K., Davis, A., & Gerewitz, J. (2016). Journal of Educational and Psychological Consultation, 26(4), 325–353." },
        { t: "International Institute for Restorative Practices. Restorative questions and circles.", u: "https://www.iirp.edu" },
      ],
    },
    {
      id: "supervision", short: "Put adults where incidents happen", tag: "Unstructured time", evidence: "strong",
      title: "Active supervision where incidents cluster",
      tagline: "Move, scan, interact: adults placed by data, in the hallway, cafeteria, bus line, and bathroom.",
      signal: "Incidents in the hallway, cafeteria, bus or bus stop, bathroom, or outside; spikes at lunch, recess, or passing time.",
      says: [
        "Active supervision (moving, scanning, interacting) plus precorrection reduced problem behavior during transitions, at recess, and in a sixth-grade classroom in a series of school studies (Colvin et al., 1997; Lewis, Colvin & Sugai, 2000; De Pry & Sugai, 2002).",
        "Better playground supervision is one of the program elements tied to larger reductions in bullying across 44 evaluations (Ttofi & Farrington, 2011).",
        "Schoolwide PBIS, which teaches and supervises expectations in common areas, reduced office referrals and suspensions in a randomized trial of 37 schools (Bradshaw, Mitchell & Leaf, 2010).",
      ],
      tryThis: [
        "Use the Where and when heatmap to pick two hot spots. Assign adults there by name, with the job described as move, scan, interact.",
        "Precorrect: thirty seconds before lunch or passing time, remind students of the two expectations that matter in that space.",
        "Teach the bus and cafeteria expectations in the space itself, not from a slide.",
        "Recheck the heatmap in four weeks. If the hot spot moved, move the adults.",
      ],
      sources: [
        { t: "Colvin, G., Sugai, G., Good, R. H., & Lee, Y. (1997). Using active supervision and precorrection to improve transition behaviors in an elementary school. School Psychology Quarterly, 12(4), 344–363." },
        { t: "Lewis, T. J., Colvin, G., & Sugai, G. (2000). The effects of pre-correction and active supervision on the recess behavior of elementary students. Education and Treatment of Children, 23(2), 109–121." },
        { t: "De Pry, R. L., & Sugai, G. (2002). The effect of active supervision and pre-correction on minor behavioral incidents in a sixth grade general education classroom. Journal of Behavioral Education, 11(4), 255–267." },
        { t: "Bradshaw, C. P., Mitchell, M. M., & Leaf, P. J. (2010). Examining the effects of schoolwide positive behavioral interventions and supports on student outcomes. Journal of Positive Behavior Interventions, 12(3), 133–148." },
        { t: "Center on PBIS.", u: "https://www.pbis.org" },
      ],
    },
    {
      id: "bullying", short: "Run a whole-school bullying response", tag: "Bullying prevention", evidence: "strong",
      title: "Bullying and online harm: a whole-school response",
      tagline: "Programs work when families, supervision, clear rules, and consistent follow-through all move together.",
      signal: "Reports of threats, \"someone was mean to me\" repeating, or anything that happened online.",
      says: [
        "School-based anti-bullying programs reduce bullying by roughly 20% and victimization by roughly 15–20% on average (Ttofi & Farrington, 2011; Gaffney, Ttofi & Farrington, 2019).",
        "The elements most linked to results: parent meetings and information, better supervision of hot spots, clear classroom rules, firm and consistent responses, and enough program duration and intensity (Ttofi & Farrington, 2011).",
        "Students are more willing to seek help for bullying and threats in schools they experience as both supportive and structured (Eliot et al., 2010).",
      ],
      tryThis: [
        "Keep the reporting door open. The kiosk's \"I need to report something\" path works only if students see follow-through, so close the loop with the reporting student every time.",
        "Send families a short note each fall and spring on what to do when something happens online, with the school's response steps.",
        "Teach bystander moves in advisory: name it, support the target, tell an adult.",
        "Pair this card with Active supervision for where the incidents cluster.",
      ],
      sources: [
        { t: "Ttofi, M. M., & Farrington, D. P. (2011). Effectiveness of school-based programs to reduce bullying: A systematic and meta-analytic review. Journal of Experimental Criminology, 7(1), 27–56." },
        { t: "Gaffney, H., Ttofi, M. M., & Farrington, D. P. (2019). Evaluating the effectiveness of school-bullying prevention programs: An updated meta-analytical review. Aggression and Violent Behavior, 45, 111–133." },
        { t: "Eliot, M., Cornell, D., Gregory, A., & Fan, X. (2010). Supportive school climate and student willingness to seek help for bullying and threats of violence. Journal of School Psychology, 48(6), 533–553." },
      ],
    },
    {
      id: "regulation", short: "Teach the feeling words", tag: "Emotion regulation", evidence: "strong",
      title: "Teach the feeling words and the strategies that work",
      tagline: "Students use the strategies they have practiced. The Pride Center should be one place among many that speaks the language.",
      signal: "Most arrivals red or blue; students arriving red or blue who do not leave green or yellow; the same feeling words every day.",
      says: [
        "RULER, the approach the Mood Meter comes from, improved students' social and emotional competence and teacher-rated academic performance (Brackett et al., 2012) and improved classroom emotional climate in a randomized trial (Rivers et al., 2013).",
        "Across 213 school-based social and emotional learning programs, students gained about 11 percentile points in achievement and showed fewer conduct problems and less emotional distress (Durlak et al., 2011). Benefits held up in follow-ups years later (Taylor et al., 2017).",
        "Breathing, movement, and talking to an adult work in the moment only when they have been taught and rehearsed beforehand.",
      ],
      tryThis: [
        "Use the same four colors and feeling words in every classroom, with a Mood Meter check-in at the start of advisory.",
        "Look at the What helped tile and teach the top three strategies in advisory, with practice rather than description.",
        "Build a Meta-Moment routine: pause, name the feeling, picture your best self, pick a strategy.",
        "When one student's visits keep ending red or blue, that is a counselor conversation, not a longer stay.",
      ],
      sources: [
        { t: "Brackett, M. A., Rivers, S. E., Reyes, M. R., & Salovey, P. (2012). Enhancing academic performance and social and emotional competence with the RULER feeling words curriculum. Learning and Individual Differences, 22(2), 218–224." },
        { t: "Rivers, S. E., Brackett, M. A., Reyes, M. R., Elbertson, N. A., & Salovey, P. (2013). Improving the social and emotional climate of classrooms: A clustered randomized controlled trial testing the RULER approach. Prevention Science, 14(1), 77–87." },
        { t: "Durlak, J. A., Weissberg, R. P., Dymnicki, A. B., Taylor, R. D., & Schellinger, K. B. (2011). The impact of enhancing students' social and emotional learning: A meta-analysis of school-based universal interventions. Child Development, 82(1), 405–432." },
        { t: "Taylor, R. D., Oberle, E., Durlak, J. A., & Weissberg, R. P. (2017). Promoting positive youth development through school-based social and emotional learning interventions: A meta-analysis of follow-up effects. Child Development, 88(4), 1156–1171." },
        { t: "RULER, Yale Center for Emotional Intelligence.", u: "https://www.rulerapproach.org" },
      ],
    },
    {
      id: "mornings", short: "Give mornings a soft landing", tag: "Routines", evidence: "promising",
      title: "A soft landing: predictable mornings and Mondays",
      tagline: "Schools cannot change what happened at home, but they control the first fifteen minutes.",
      signal: "Visits bunched before 10 a.m. or on Mondays; many students saying what happened was at home.",
      says: [
        "The Responsive Classroom approach, built around a daily morning meeting and consistent routines, produced gains in math and reading in a three-year randomized trial (Rimm-Kaufman et al., 2014).",
        "Adolescents are biologically shifted toward later sleep. The American Academy of Pediatrics recommends middle and high schools start no earlier than 8:30 a.m. because short sleep is tied to mood, behavior, and attention problems (AAP, 2014).",
        "Students arriving dysregulated are often carrying the morning or the weekend with them. A predictable adult and a predictable routine lower the cost of walking in.",
      ],
      tryThis: [
        "Open a soft-landing option before first hour: the Pride Center or a library corner with a predictable adult, no questions for the first ten minutes.",
        "Start first hour and Monday advisory with a two-minute check-in (a color and one word) before content.",
        "Breakfast after the bell for students who arrive late or hungry. Pair with the Basic needs card.",
        "If visits cluster at the same hour daily, walk the building at that hour for a week and look at what happens right before.",
      ],
      sources: [
        { t: "Rimm-Kaufman, S. E., Larsen, R. A. A., Baroody, A. E., Curby, T. W., Ko, M., Thomas, J. B., Merritt, E. G., Abry, T., & DeCoster, J. (2014). Efficacy of the Responsive Classroom approach: Results from a 3-year, longitudinal randomized controlled trial. American Educational Research Journal, 51(3), 567–603." },
        { t: "American Academy of Pediatrics, Adolescent Sleep Working Group (2014). School start times for adolescents. Pediatrics, 134(3), 642–649." },
      ],
    },
    {
      id: "basicNeeds", short: "Meet basic needs first", tag: "Basic needs", evidence: "promising",
      title: "Basic needs first",
      tagline: "A hungry or cold student is not available for regulation strategies or for algebra.",
      signal: "Students requesting food, hygiene items, clothing, or supplies; visits around breakfast and lunch.",
      says: [
        "Food insecurity in childhood is linked to lower academic performance and weaker social skills over time, independent of family income (Jyoti, Frongillo & Jones, 2005).",
        "Community school models that bring health, food, and family supports into the building have a solid evidence base for attendance, behavior, and achievement when the supports are well integrated (Maier et al., 2017, Learning Policy Institute).",
        "Breakfast after the bell, in the classroom or grab-and-go, raises participation sharply compared with cafeteria breakfast before school (Food Research & Action Center).",
      ],
      tryThis: [
        "Keep the needs closet stocked and private: no forms in front of peers, and the student leaves with the item that visit.",
        "Watch the Basic needs requested tile monthly and order ahead of the pattern (period products, chargers, winter clothing).",
        "Share the trend, never the names, with the PTO and a community partner and ask for a standing supply.",
        "If food leads the list, talk with food service about breakfast after the bell or a second-chance breakfast.",
      ],
      sources: [
        { t: "Jyoti, D. F., Frongillo, E. A., & Jones, S. J. (2005). Food insecurity affects school children's academic performance, weight gain, and social skills. Journal of Nutrition, 135(12), 2831–2839." },
        { t: "Maier, A., Daniel, J., Oakes, J., & Lam, L. (2017). Community schools as an effective school improvement strategy: A review of the evidence. Learning Policy Institute." },
        { t: "Food Research & Action Center. Breakfast After the Bell.", u: "https://frac.org" },
      ],
    },
    {
      id: "cico", short: "Start Check-In/Check-Out", tag: "Tier 2 support", evidence: "strong",
      title: "A few students, most of the visits: Check-In/Check-Out",
      tagline: "Frequent visits are data, not a verdict. The dashboard's job is to help the team notice early.",
      signal: "Five students make up a third or more of visits; the same names arriving red or blue week after week.",
      says: [
        "Check-In/Check-Out (CICO) is the most-studied Tier 2 behavior intervention: a morning check-in with a chosen adult, a point card across the day, and an afternoon check-out. Reviews find consistent reductions in problem behavior, strongest for students whose behavior is maintained by adult attention (Hawken et al., 2014; Maggin et al., 2015).",
        "It works because it builds a relationship, adds structure, and gives feedback many times a day, which is what frequent Pride Center visitors are often seeking.",
        "Tier 2 is a team decision made from data, every two weeks, not a referral made in frustration.",
      ],
      tryThis: [
        "Use the Students with the most visits table as a Tier 2 screening list and review it every two weeks with the counselor.",
        "Start CICO with three to five students and one check-in adult each. Keep the point card to three expectations.",
        "Ask the student what they want the visits to do for them, and write their words on the plan.",
        "Fade on purpose: after four good weeks, move to a self-monitoring version.",
      ],
      sources: [
        { t: "Hawken, L. S., Bundock, K., Kladis, K., O'Keeffe, B., & Barrett, C. A. (2014). Systematic review of the Check-in, Check-out intervention for students at risk for emotional and behavioral disorders. Education and Treatment of Children, 37(4), 635–658." },
        { t: "Maggin, D. M., Zurheide, J., Pickett, K. C., & Baillie, S. J. (2015). A systematic evidence review of the Check-in/Check-out program for reducing student challenging behaviors. Journal of Positive Behavior Interventions, 17(4), 197–208." },
        { t: "Center on PBIS. Tier 2.", u: "https://www.pbis.org/pbis/tier-2" },
      ],
    },
    {
      id: "followUp", short: "Close the loop within 48 hours", tag: "Follow-up", evidence: "promising",
      title: "Close the loop fast",
      tagline: "Reporting is a trust behavior. Silence after a report teaches students not to report.",
      signal: "Incident reports still open; follow-up taking more than a few days; students who stop reporting.",
      says: [
        "Students are more willing to seek help for bullying and threats in schools where they see adults as supportive and fair (Eliot et al., 2010).",
        "An authoritative school climate, high structure together with high support, is associated with lower rates of risk behavior and victimization (Cornell & Huang, 2016).",
        "Across decades of studies, students' sense of safety and of being heard tracks with engagement and achievement (Thapa et al., 2013).",
      ],
      tryThis: [
        "Set a 48-hour norm: every report gets a conversation with the reporting student within two school days, even when the investigation takes longer.",
        "Tell the student what happened next in words they can repeat to a friend. That is how the next report arrives.",
        "Check the Still open number every Monday. Anything open more than three days gets a named owner that day.",
        "Use the Follow up form's action list consistently so the Follow-up actions donut means something over time.",
      ],
      sources: [
        { t: "Eliot, M., Cornell, D., Gregory, A., & Fan, X. (2010). Journal of School Psychology, 48(6), 533–553." },
        { t: "Cornell, D., & Huang, F. (2016). Authoritative school climate and high school student risk behavior: A cross-sectional multi-level analysis of student self-reports. Journal of Youth and Adolescence, 45(11), 2246–2259." },
        { t: "Thapa, A., Cohen, J., Guffey, S., & Higgins-D'Alessandro, A. (2013). A review of school climate research. Review of Educational Research, 83(3), 357–385." },
      ],
    },
    {
      id: "voice", short: "Bring students into the data", tag: "Student voice", evidence: "promising",
      title: "Student voice: let students read the trends too",
      tagline: "Students coming in on their own is a trust signal. When most visits are staff-sent, the room may not feel like theirs yet.",
      signal: "Few students coming on their own; mostly staff-sent visits; many typed-in feeling words.",
      says: [
        "Student voice initiatives, where students help identify problems and shape solutions, build agency, belonging, and competence, the developmental assets most tied to staying engaged in school (Mitra, 2004).",
        "Student-survey work from the Quaglia Institute for School Voice and Aspirations links students' sense of having a voice in school to their engagement and sense of belonging. This is survey evidence, so treat it as a link rather than proof of cause.",
        "Positive school climate, including students' sense of being heard, is associated with higher achievement and less misbehavior (Thapa et al., 2013).",
      ],
      tryThis: [
        "Convene a student advisory group monthly to look at this dashboard's charts (no names) and suggest one change.",
        "Let students name and redesign the stations. The words they type with \"Type my own word\" are a free vocabulary survey.",
        "Ask departing eighth graders what would have made them come in sooner.",
        "Publish one student-suggested change each quarter and credit the group.",
      ],
      sources: [
        { t: "Mitra, D. L. (2004). The significance of students: Can increasing \"student voice\" in schools lead to gains in youth development? Teachers College Record, 106(4), 651–688." },
        { t: "Quaglia Institute for School Voice and Aspirations. School Voice reports.", u: "https://quagliainstitute.org" },
        { t: "Thapa, A., Cohen, J., Guffey, S., & Higgins-D'Alessandro, A. (2013). Review of Educational Research, 83(3), 357–385." },
      ],
    },
    {
      id: "pbis", short: "Re-teach schoolwide expectations", tag: "Schoolwide systems", evidence: "strong",
      title: "Teach and recognize expectations schoolwide",
      tagline: "Three to five expectations, taught in each setting, acknowledged far more often than corrected, steered by data.",
      signal: "Incident reports trending up; incidents spread across many places and periods rather than one hot spot.",
      says: [
        "Schoolwide PBIS reduced office discipline referrals and suspensions in a randomized trial of 37 elementary schools (Bradshaw, Mitchell & Leaf, 2010), and schools' safety ratings improved in a wait-list controlled trial (Horner et al., 2009).",
        "The active ingredients are plain: define a few expectations, teach them in each setting, acknowledge students who meet them, and use data like this dashboard to decide where to focus.",
        "Positive school climate overall is associated with higher achievement and lower absenteeism and misbehavior across decades of studies (Thapa et al., 2013).",
      ],
      tryThis: [
        "Re-teach expectations after every long break in the places where incidents happen, not in the gym assembly.",
        "Set a visible acknowledgment system and check the ratio: students should hear specific praise about five times as often as correction.",
        "Bring the Incident reports by week chart to the monthly PBIS team meeting and pick one place to focus on for the next month.",
        "Keep a Tier 1 fidelity check (the Tiered Fidelity Inventory) on the calendar twice a year.",
      ],
      sources: [
        { t: "Bradshaw, C. P., Mitchell, M. M., & Leaf, P. J. (2010). Journal of Positive Behavior Interventions, 12(3), 133–148." },
        { t: "Horner, R. H., Sugai, G., Smolkowski, K., Eber, L., Nakasato, J., Todd, A. W., & Esperanza, J. (2009). A randomized, wait-list controlled effectiveness trial assessing school-wide positive behavior support in elementary schools. Journal of Positive Behavior Interventions, 11(3), 133–144." },
        { t: "Thapa, A., Cohen, J., Guffey, S., & Higgins-D'Alessandro, A. (2013). Review of Educational Research, 83(3), 357–385." },
        { t: "Center on PBIS.", u: "https://www.pbis.org" },
      ],
    },
  ];
  const BY_ID = {}; CARDS.forEach(c => { BY_ID[c.id] = c; });
  const TAGS = [...new Set(CARDS.map(c => c.tag))];

  // ---------- Notices: rules that read the board's rows ----------
  const pct = (n, d) => d ? Math.round(100 * n / d) : 0;
  const count = (rows, f) => rows.filter(f).length;
  const topOf = (rows, key) => { const m = new Map(); rows.forEach(r => { const k = key(r); if (k) m.set(k, (m.get(k) || 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const OUTSIDE_CLASS = /hallway|cafeteria|bus|outside|gym|bathroom|stairwell|playground|lunch/i;
  const PEER = /mean|hit|pushed|threat|fight/i;
  // Each rule: boards it applies to, the card it points at, and run(visits, incidents) returning
  // { score, noticed } when the pattern is there (score 1 = right at the threshold, higher = stronger).
  const RULES = [
    { id: "hardArrivals", boards: ["overview", "support"], card: "regulation", run(v) {
      if (v.length < 10) return null; const n = count(v, r => r.arrivedHard), s = n / v.length; if (s < .5) return null;
      return { score: s / .5, noticed: `${pct(n, v.length)}% of ${plural(v.length, "visit")} arrived red or blue.` }; } },
    { id: "lowRecovery", boards: ["overview", "support"], card: "regulation", run(v) {
      const hard = v.filter(r => r.arrivedHard && r.improved !== null); if (hard.length < 10) return null;
      const ok = count(hard, r => r.improved), s = ok / hard.length; if (s >= .6) return null;
      return { score: .6 / Math.max(s, .05), noticed: `Only ${pct(ok, hard.length)}% of the ${hard.length} students who arrived red or blue left green or yellow.` }; } },
    { id: "blueArrivals", boards: ["overview", "support"], card: "belonging", run(v) {
      if (v.length < 10) return null; const n = count(v, r => r.moodIn === "Blue"), s = n / v.length; if (s < .35) return null;
      return { score: s / .35, noticed: `${pct(n, v.length)}% of ${plural(v.length, "visit")} arrived blue: tired, sad, lonely, or down.` }; } },
    { id: "alerts", boards: ["overview", "support"], card: "belonging", run(v) {
      const n = count(v, r => r.alert); if (n < 3 || n / v.length < .04) return null;
      return { score: (n / v.length) / .04, noticed: `${plural(n, "visit")} started with an alert word such as hopeless or enraged.` }; } },
    { id: "teacherContext", boards: ["overview"], card: "relationships", run(v) {
      const w = v.filter(r => r.happened); if (w.length < 10) return null; const n = count(w, r => /teacher/i.test(r.happened)), s = n / w.length; if (s < .3) return null;
      return { score: s / .3, noticed: `${pct(n, w.length)}% of students said what happened was with their teacher.` }; } },
    { id: "homeContext", boards: ["overview"], card: "mornings", run(v) {
      const w = v.filter(r => r.happened); if (w.length < 10) return null; const n = count(w, r => /home/i.test(r.happened)), s = n / w.length; if (s < .3) return null;
      return { score: s / .3, noticed: `${pct(n, w.length)}% of students said what happened was at home.` }; } },
    { id: "earlyVisits", boards: ["overview"], card: "mornings", run(v) {
      if (v.length < 10) return null; const n = count(v, r => r.hour < 10), s = n / v.length; if (s < .45) return null;
      return { score: s / .45, noticed: `${pct(n, v.length)}% of visits happen before 10 a.m.` }; } },
    { id: "mondays", boards: ["overview"], card: "mornings", run(v) {
      if (v.length < 20) return null; const n = count(v, r => r.weekday === "Mon"), s = n / v.length; if (s < .3) return null;
      return { score: s / .3, noticed: `${pct(n, v.length)}% of visits fall on Mondays.` }; } },
    { id: "defiance", boards: ["overview", "incidents", "support"], card: "discipline", run(v) {
      const staff = v.filter(r => /staff/i.test(r.referral)); if (staff.length < 8) return null; const n = count(staff, r => /defian/i.test(r.reason)), s = n / staff.length; if (s < .25) return null;
      return { score: s / .25, noticed: `${pct(n, staff.length)}% of the ${plural(staff.length, "staff-sent visit")} were for defiance.` }; } },
    { id: "selfReferral", boards: ["overview", "support"], card: "voice", run(v) {
      if (v.length < 20) return null; const n = count(v, r => /self|own/i.test(r.referral)), s = n / v.length; if (s >= .4) return null;
      return { score: .4 / Math.max(s, .05), noticed: `Only ${pct(n, v.length)}% of visits were students coming in on their own.` }; } },
    { id: "concentration", boards: ["overview", "support"], card: "cico", run(v) {
      const top = topOf(v, r => r.student); if (top.length < 8 || v.length < 20) return null; const n = top.slice(0, 5).reduce((a, [, c]) => a + c, 0), s = n / v.length; if (s < .35) return null;
      return { score: s / .35, noticed: `Five students account for ${pct(n, v.length)}% of ${plural(v.length, "visit")}.` }; } },
    { id: "basicNeeds", boards: ["overview", "support"], card: "basicNeeds", run(v) {
      const w = v.filter(r => r.basicNeeds && r.basicNeeds.length); if (w.length < 5 || w.length / v.length < .06) return null;
      const top = topOf(w.flatMap(r => r.basicNeeds.map(n => ({ n }))), r => r.n)[0];
      return { score: (w.length / v.length) / .06, noticed: `${plural(w.length, "visit")} included a basic need${top ? ", most often " + top[0].toLowerCase() : ""}.` }; } },
    { id: "unstructured", boards: ["overview", "incidents"], card: "supervision", run(v, i) {
      if (i.length < 5) return null; const w = i.filter(r => OUTSIDE_CLASS.test(r.place)); const s = w.length / i.length; if (s < .5) return null; const top = topOf(w, r => r.place)[0];
      return { score: s / .5, noticed: `${pct(w.length, i.length)}% of ${plural(i.length, "incident report")} happened outside classrooms${top ? ", most often in the " + top[0].toLowerCase() : ""}.` }; } },
    { id: "lunchPassing", boards: ["incidents"], card: "supervision", run(v, i) {
      if (i.length < 5) return null; const n = count(i, r => /lunch|recess|passing|before school|breakfast/i.test(r.period)), s = n / i.length; if (s < .4) return null;
      return { score: s / .4, noticed: `${pct(n, i.length)}% of incident reports come from lunch, recess, passing time, or before school.` }; } },
    { id: "classroomIncidents", boards: ["incidents"], card: "relationships", run(v, i) {
      if (i.length < 5) return null; const n = count(i, r => /classroom/i.test(r.place)), s = n / i.length; if (s < .4) return null;
      return { score: s / .4, noticed: `${pct(n, i.length)}% of incident reports happened in a classroom.` }; } },
    { id: "peerHarm", boards: ["overview", "incidents"], card: "restorative", run(v, i) {
      if (i.length < 5) return null; const n = count(i, r => r.types.some(t => PEER.test(t))), s = n / i.length; if (s < .5) return null;
      return { score: s / .5, noticed: `${pct(n, i.length)}% of incident reports describe another student being mean, physical, or threatening.` }; } },
    { id: "online", boards: ["overview", "incidents"], card: "bullying", run(v, i) {
      if (i.length < 5) return null; const n = count(i, r => r.types.some(t => /online/i.test(t))), s = n / i.length; if (s < .15) return null;
      return { score: s / .15, noticed: `${plural(n, "incident report")} (${pct(n, i.length)}%) involved something that happened online.` }; } },
    { id: "openIncidents", boards: ["overview", "incidents"], card: "followUp", run(v, i) {
      if (i.length < 5) return null; const n = count(i, r => r.open), s = n / i.length; const days = i.filter(r => r.daysToFollowUp !== null); const avg = days.length ? days.reduce((a, r) => a + r.daysToFollowUp, 0) / days.length : 0;
      if (s < .3 && avg <= 3) return null;
      return { score: Math.max(s / .3, avg / 3), noticed: s >= .3 ? `${pct(n, i.length)}% of ${plural(i.length, "incident report")} are still open.` : `Follow-up is taking ${Math.round(avg * 10) / 10} days on average.` }; } },
    { id: "rising", boards: ["overview", "incidents"], card: "pbis", run(v, i, now) {
      if (i.length < 8) return null; const t = now.getTime(), wk = 7 * 86400000;
      const recent = count(i, r => t - r.ts.getTime() <= 4 * wk), prior = count(i, r => { const d = t - r.ts.getTime(); return d > 4 * wk && d <= 8 * wk; });
      if (prior < 4 || recent < prior * 1.25) return null;
      return { score: recent / prior, noticed: `${recent} incident reports in the last four weeks, up from ${prior} in the four weeks before.` }; } },
  ];
  const DEFAULTS = { overview: "belonging", incidents: "supervision", support: "cico", all: "belonging" };

  /** Ranked notices for a board focus ("overview" | "incidents" | "support" | "all"). Always returns at least one entry. */
  function notices(focus, rows, now) {
    now = now || new Date();
    const v = rows.visits || [], i = rows.incidents || [];
    const out = [];
    RULES.forEach(rule => {
      if (focus !== "all" && !rule.boards.includes(focus)) return;
      let r = null; try { r = rule.run(v, i, now); } catch (err) { r = null; }
      if (r) out.push({ rule: rule.id, card: BY_ID[rule.card], score: r.score, noticed: r.noticed });
    });
    out.sort((a, b) => b.score - a.score);
    // One notice per card, strongest first.
    const seen = new Set(), picks = out.filter(n => !seen.has(n.card.id) && seen.add(n.card.id));
    if (!picks.length) picks.push({ rule: null, card: BY_ID[DEFAULTS[focus] || DEFAULTS.all], score: 0, noticed: "" });
    return picks;
  }

  window.PPR = { CARDS, TAGS, EVIDENCE, RULES, card: id => BY_ID[id] || null, notices };
})();
