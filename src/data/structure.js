export const teachingGroups = [
  {
    title: 'Direct Teaching',
    items: [
      ['course_outline', 'Course outlines'],
      ['lectures_quizzes', 'Lectures and quizzes'],
      ['mid_semester', 'Mid-semester work'],
      ['end_semester_exam', 'End-semester exam work'],
      ['question_paper_setting', 'Question paper setting'],
      ['examination_duty', 'Examination duty'],
      ['invigilation', 'Invigilation'],
      ['evaluation', 'Evaluation']
    ]
  }
];

export const researchGroups = [
  {
    title: 'Publications',
    items: [
      ['journal_articles', 'Journal Articles'],
      ['conference_papers', 'Conference Papers'],
      ['authored_books', 'Books'],
      ['edited_books', 'Edited Books'],
      ['book_chapters', 'Book Chapters']
    ]
  }
];

export const projectGroups = [
  {
    title: 'Projects',
    items: [
      ['consultancy_project', 'Consultancy Projects'],
      ['sponsored_project', 'Sponsored Projects'],
      ['research_project', 'Research Projects']
    ]
  }
];

export const supervisionGroups = [
  {
    title: 'Supervision',
    items: [
      ['PhD', 'Ph.D.'],
      ['Masters', 'Masters'],
      ['UG', 'UG'],
      ['Intern', 'External / Intern']
    ]
  }
];

export const mentorGroups = [
  {
    title: 'Mentors',
    items: [
      ['internal_collaborator', 'Internal Collaborator'],
      ['external_collaborator', 'External Collaborator'],
      ['student_group_leader', 'Student Group Leaders']
    ]
  }
];

export const administrationGroups = [
  {
    title: 'Co-Curricular',
    items: [
      ['nsc_ncc', 'NSC / NCC'],
      ['counselling', 'Counselling'],
      ['sports', 'Sports'],
      ['exhibition', 'Exhibition'],
      ['competition', 'Competition'],
      ['departmental_cultural_activities', 'Departmental Cultural Activities'],
      ['ngo', 'NGO'],
      ['institutional_cultural_activities', 'Institutional Cultural Activities'],
      ['port_visit', 'Port Visit'],
      ['study_tour', 'Study Tour'],
      ['workshop', 'Workshop']
    ]
  },
  {
    title: 'Corporate / Academic Administrative',
    items: [
      ['dean_chairperson_admission_chairman', 'Dean / Chairperson / Admission Committee Chairman'],
      ['programme_director_certificate', 'Programme Director / Incharge (Certificate Programme)'],
      ['programme_director_full_part_executive', 'Programme Director (Full-Time) / Part-Time / Executive'],
      ['mdp_1_3_days', 'PD for MDP of 1-3 days'],
      ['mdp_3_7_days', 'PD for MDP of 3-7 days'],
      ['exam_cell_controller_admission_member', 'Examination Cell In-charge / Controller of Examination / Admission Committee Member'],
      ['committee_member_warden', 'Committee Member / Warden'],
      ['assistant_warden', 'Assistant Warden'],
      ['board_member', 'Board Member'],
      ['gd_pi_viva', 'GD / PI / VIVA'],
      ['academic_council_coordinator', 'Academic Council Coordinator'],
      ['bom_member', 'BoM Member']
    ]
  },
  {
    title: 'Professional Development',
    items: [
      ['seminar_workshop_symposia', 'Seminar / Workshop / Symposia'],
      ['conferences', 'Conferences'],
      ['faculty_development_course', 'Faculty Development Course'],
      ['short_term_training_course', 'Short Term Training Courses'],
      ['association_membership_national', 'Membership of Association (National Level)'],
      ['association_membership_state', 'Membership of Association (State Level)'],
      ['general_article_publications', 'General Article Publications'],
      ['general_awareness_activity', 'General Awareness Activity'],
      ['community_work', 'Community work'],
      ['editorial', 'Editorial'],
      ['committee_member', 'Committee Member'],
      ['committee_chair', 'Committee Chair']
    ]
  }
];

export const careerGroups = [
  {
    title: 'Career Mobility',
    items: [
      ['visiting_faculty', 'Visiting Faculty'],
      ['adjunct_faculty', 'Adjunct Faculty'],
      ['teaching_application', 'Teaching Applications'],
      ['miscellaneous', 'Miscellaneous']
    ]
  }
];

export const subscriptionGroups = [
  {
    title: 'Subscription',
    items: [
      ['software', 'Software / Tools'],
      ['journal_database', 'Journal / Database'],
      ['professional_membership', 'Professional Membership'],
      ['learning_platform', 'Learning Platform'],
      ['miscellaneous', 'Miscellaneous']
    ]
  }
];

export function optionList(groups) {
  return groups.flatMap((group) => group.items);
}
