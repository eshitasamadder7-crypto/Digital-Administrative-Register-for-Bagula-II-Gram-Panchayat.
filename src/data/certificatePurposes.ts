export interface PurposeItem {
  category: string;
  statement: string;
  bengaliStatement: string;
  requiredProof: string;
  keywords?: string[];
}

export interface CertificatePurposes {
  id: string;
  name: string;
  bengaliName: string;
  icon: string;
  tag: string;
  summary: string;
  purposes: PurposeItem[];
}

export const CERTIFICATE_PURPOSES: CertificatePurposes[] = [
  {
    id: "residential",
    name: "Residential Certificate",
    bengaliName: "আবাসিক শংসাপত্র (বাসস্থানের প্রমাণ)",
    icon: "🏠",
    tag: "Everyday Services",
    summary:
      "Required as statutory proof that the applicant has permanent or ordinary residence within the geographical jurisdiction of Bagula 2 No Gram Panchayat.",
    purposes: [
      {
        category: "Educational Admission",
        statement: "For admission in Primary / Secondary School / College under Bagula local residence quota.",
        bengaliStatement: "বিদ্যালয় বা কলেজে স্থানীয় আবাসিক কোটায় ভর্তির উদ্দেশ্যে।",
        requiredProof: "Aadhaar Card or School ID + Tax receipt of Bagula II GP.",
      },
      {
        category: "Ration Card (NFSA / RKSY)",
        statement: "For submission to Food & Supplies Dept for new Digital Ration Card or family head address transfer.",
        bengaliStatement: "নতুন ডিজিটাল রেশন কার্ড তৈরি বা পরিবার প্রধানের ঠিকানা স্থানান্তরের উদ্দেশ্যে।",
        requiredProof: "Ration card surrender slip / e-Ration Card + Electricity bill.",
      },
      {
        category: "Passport & Visa Police Verification",
        statement: "For presentation to District Intelligence Branch (DIB) Nadia / Regional Passport Office (RPO) Kolkata for Passport issuance.",
        bengaliStatement: "পাসপোর্ট ভেরিফিকেশন ও পুলিশি তদন্তের জন্য।",
        requiredProof: "Aadhaar Card + Voter ID + Land/Tax receipt.",
      },
      {
        category: "Domestic WBSEDCL Electricity Connection",
        statement: "For obtaining new low-tension domestic electricity connection from WBSEDCL Bagula Customer Care Centre.",
        bengaliStatement: "ডব্লিউবিএসইডিসিএল বাগুলা অফিস থেকে নতুন বিদ্যুৎ সংযোগ গ্রহণের উদ্দেশ্যে।",
        requiredProof: "Aadhaar + Land ownership porcha / RoR or Landlord consent.",
      },
      {
        category: "Banking & Financial Services",
        statement: "For opening a Savings Bank / Post Office account under KYC residential norms.",
        bengaliStatement: "ব্যাংক বা পোস্ট অফিসে নতুন সেভিংস একাউন্ট খোলার কেওয়াইসি উদ্দেশ্যে।",
        requiredProof: "Aadhaar / Voter ID + Gram Sansad member attestation.",
      },
    ],
  },
  {
    id: "character",
    name: "Character Certificate",
    bengaliName: "চারিত্রিক শংসাপত্র",
    icon: "📋",
    tag: "Employment & Verification",
    summary:
      "Official attestation of moral conduct, good character, and lack of adverse local reports issued by Bagula II Gram Panchayat Pradhan.",
    purposes: [
      {
        category: "Government Job Appointment",
        statement: "For submission during final document verification & Police Verification (VR) for State / Central Government service.",
        bengaliStatement: "সরকারি বা আধা-সরকারি চাকরির নিয়োগপত্র ও পুলিশ ভেরিফিকেশনের উদ্দেশ্যে।",
        requiredProof: "Job selection / appointment letter + Aadhaar Card.",
      },
      {
        category: "Armed Forces & Paramilitary Rallies",
        statement: "For presentation at Indian Army Agniveer / Navy / Air Force / CAPF (BSF, CISF, CRPF, SSB) recruitment rally.",
        bengaliStatement: "সেনাবাহিনী বা প্যারামিলিটারি রিক্রুটমেন্ট র‍্যালিতে দাখিলের উদ্দেশ্যে।",
        requiredProof: "Rally Admit card + Class-X Admit Card + Sansad Member certificate.",
      },
      {
        category: "West Bengal Police Recruitment (WBPRB)",
        statement: "For document scrutiny and background character verification for WB Police Constable / Sub-Inspector.",
        bengaliStatement: "পশ্চিমবঙ্গ পুলিশ কনস্টেবল বা সাব-ইন্সপেক্টর নিয়োগ যাচাইয়ের উদ্দেশ্যে।",
        requiredProof: "WBPRB Interview Call Letter + Voter ID + Aadhaar.",
      },
      {
        category: "Educational Institution & Hostel",
        statement: "For admission to college hostel, technical institute, or university post-graduate departments.",
        bengaliStatement: "কলেজ হোস্টেলে সিট বরাদ্দ বা উচ্চশিক্ষায় ভর্তির উদ্দেশ্যে।",
        requiredProof: "College admission allotment slip + Aadhaar.",
      },
      {
        category: "Private / Corporate Employment",
        statement: "For employer background verification & joining formalities in registered private companies or PSUs.",
        bengaliStatement: "বেসরকারি প্রতিষ্ঠানে চাকরির নিয়োগকালীন চারিত্রিক যাচাইয়ের উদ্দেশ্যে।",
        requiredProof: "Employer offer letter + Identity proof.",
      },
    ],
  },
  {
    id: "income",
    name: "Income Certificate",
    bengaliName: "বার্ষিক আয়ের শংসাপত্র",
    icon: "💰",
    tag: "Scholarships & Financial Aid",
    summary:
      "Annual family gross income assessment certified by the Bagula II Gram Panchayat authority for academic fee concessions and scholarship schemes.",
    purposes: [
      {
        category: "Oasis Scholarship (SC / ST / OBC)",
        statement: "For applying for Oasis Pre-Matric and Post-Matric Scholarship through Backward Classes Welfare Dept, Govt of WB.",
        bengaliStatement: "অনগ্রসর শ্রেণি কল্যাণ দপ্তরের ওয়াসিস (Oasis) স্কলারশিপ আবেদনের উদ্দেশ্যে।",
        requiredProof: "Family income declaration affidavit / Salary certificate + Caste card.",
      },
      {
        category: "SVMCM (Swami Vivekananda Scholarship)",
        statement: "For applying for Swami Vivekananda Merit-cum-Means (SVMCM) scholarship (annual family income below ₹2.5 Lakhs).",
        bengaliStatement: "স্বামী বিবেকানন্দ মেরিট-কাম-মিনস (SVMCM) বৃত্তির আবেদনের উদ্দেশ্যে।",
        requiredProof: "Income affidavit from Judicial Magistrate / Notary + Marksheet.",
      },
      {
        category: "Aikyashree / Minority Scholarship",
        statement: "For submission to West Bengal Minorities Development & Finance Corporation for Aikyashree scholarship.",
        bengaliStatement: "সংখ্যালঘু উন্নয়ন ও বিত্ত নিগমের ঐক্যশ্রী স্কলারশিপের উদ্দেশ্যে।",
        requiredProof: "Institution verification + Family income declaration.",
      },
      {
        category: "EWS Certificate Processing",
        statement: "As primary local GP income recommendation for obtaining Economically Weaker Section (EWS) certificate at SDO Ranaghat.",
        bengaliStatement: "এসডিও রানাঘাট অফিস থেকে ইডব্লিউএস (EWS) সার্টিফিকেট পাওয়ার প্রাথমিক যাচাইয়ের জন্য।",
        requiredProof: "Land Porcha + Income proof + Tax clearance.",
      },
      {
        category: "Banglar Bari / PMAY Housing Scheme",
        statement: "For proving low income eligibility under Banglar Bari / Pradhan Mantri Awas Yojana rural housing benefits.",
        bengaliStatement: "বাংলার বাড়ি বা আবাস যোজনায় গৃহহীন/দরিদ্র কোটায় আবেদনের উদ্দেশ্যে।",
        requiredProof: "Job card / Ration card + Sansad member recommendation.",
      },
    ],
  },
  {
    id: "same-person",
    name: "Same Person Certificate",
    bengaliName: "একই ব্যক্তি শংসাপত্র",
    icon: "🧑",
    tag: "Record & Identity Harmonization",
    summary:
      "Official administrative attestation by Bagula II GP that two differently spelled or recorded names in disparate government documents identify one and the same living person.",
    purposes: [
      {
        category: "Aadhaar vs. Voter ID Discrepancy",
        statement: "To reconcile minor spelling discrepancy or surname variation between Aadhaar Card and EPIC Voter ID.",
        bengaliStatement: "আধার কার্ড ও ভোটার কার্ডের নামের বানানের গরমিল সংশোধনের উদ্দেশ্যে।",
        requiredProof: "Copies of both Aadhaar and Voter Card + Sansad Member verification.",
      },
      {
        category: "Madhyamik / Board Exam Record Correction",
        statement: "For submission to WBBSE / WBCHSE for correcting father's or student's name in Board Admit Card and Certificate.",
        bengaliStatement: "মাধ্যমিক বা উচ্চমাধ্যমিক বোর্ডের সার্টিফিকেটে নামের ভুল সংশোধনের উদ্দেশ্যে।",
        requiredProof: "School admission register extract + Both ID proofs.",
      },
      {
        category: "Bank Account & Deceased Legal Heir KYC",
        statement: "To establish that account holder name matches claimant or nominee name for deceased pension/fund settlement.",
        bengaliStatement: "ব্যাংক একাউন্টে নাম সংশোধন বা নমিনি টাকা উত্তোলনের উদ্দেশ্যে।",
        requiredProof: "Bank passbook copy + Legal heir identity proof.",
      },
      {
        category: "Land Mutation & Deed (Dalil) Alignment",
        statement: "For submission to BL&LRO Hanskhali to prove that name recorded on Land Purchase Deed (Dalil) matches RoR / Porcha record.",
        bengaliStatement: "বিএলএলআরও হাঁসখালি অফিসে জমি রেজিস্ট্রি দলিলের নামের সাথে পর্চার নাম মেলানোর জন্য।",
        requiredProof: "Deed (Dalil) copy + Porcha / RoR copy + Gram Sansad report.",
      },
    ],
  },
  {
    id: "distance",
    name: "Distance Certificate",
    bengaliName: "দূরত্বের শংসাপত্র",
    icon: "📏",
    tag: "Concessions & Transportation",
    summary:
      "Certifies the exact radial and roadway distance in kilometers from the resident's home in Bagula II GP to an educational institution or workplace.",
    purposes: [
      {
        category: "Railway Monthly Season Ticket (MST) Concession",
        statement: "For obtaining Eastern Railway student travel monthly concession ticket between Bagula Railway Station and Sealdah / Ranaghat / Krishnanagar.",
        bengaliStatement: "বাগুলা রেল স্টেশন থেকে ছাত্রছাত্রীদের ট্রেনের মান্থলি কনসেশন টিকিটের জন্য।",
        requiredProof: "School / College student identity card + Bagula II GP address proof.",
      },
      {
        category: "School / College Admission Distance Quota",
        statement: "To certify distance in kilometers from applicant's residence to school for admission priority under neighborhood norms.",
        bengaliStatement: "শিক্ষা প্রতিষ্ঠানে দূরবর্তী এলাকার ছাত্র হিসেবে সুবিধা প্রাপ্তির জন্য।",
        requiredProof: "School prospectus notice + Gram Sansad member distance attestation.",
      },
      {
        category: "Employee Conveyance Allowance / HRA Claim",
        statement: "For submission to employer to substantiate daily commuting distance and claim statutory traveling allowance.",
        bengaliStatement: "চাকরির কর্মস্থলে যাতায়াত ভাতা (Conveyance Allowance) দাবির উদ্দেশ্যে।",
        requiredProof: "Employee ID card + Present address proof.",
      },
      {
        category: "Government Service Transfer Hardship",
        statement: "To demonstrate commuting distance hardship when requesting administrative transfer to a closer station.",
        bengaliStatement: "সরকারি কর্মচারীদের দূরত্বের কারণে বদলির আবেদনের সমর্থনে।",
        requiredProof: "Departmental service book / appointment order + Distance verification.",
      },
    ],
  },
  {
    id: "caste",
    name: "Caste Authentication",
    bengaliName: "জাতিগত প্রমাণীকরণ শংসাপত্র",
    icon: "🏷️",
    tag: "Mandatory SC/ST Verification",
    summary:
      "Preliminary caste verification required prior to official digital SC/ST/OBC certificate application at SDO Ranaghat. Enforces unbroken paternal descent from an existing certificate holder.",
    purposes: [
      {
        category: "Official SC / ST / OBC Portal Application",
        statement: "For uploading as mandatory local GP certificate on castewestbengal.gov.in / SDO Ranaghat e-governance portal.",
        bengaliStatement: "অনলাইন এসসি/এসটি/ওবিসি সার্টিফিকেট আবেদনে পঞ্চায়েত প্রত্যায়ন হিসেবে জমা করার জন্য।",
        requiredProof: "Existing blood relative's SC/ST certificate + Vamshabriksha (Merged Single PDF <2 MB).",
      },
      {
        category: "Paternal Lineage & Vamshabriksha Authentication",
        statement: "To officially prove unbroken paternal bloodline descent from an existing SC/ST card holder (Father, Grandfather, Real Brother, Paternal Uncle).",
        bengaliStatement: "বাবার বংশের রক্তসম্পর্কীয় আত্মীয়ের কাস্ট কার্ডের ভিত্তিতে বংশতালিকা প্রমাণের উদ্দেশ্যে।",
        requiredProof: "Gram Sansad Member signed genealogical tree + Existing card copy.",
      },
      {
        category: "Oasis Scholarship Category Clearance",
        statement: "Provisional caste verification for students whose SDO digital caste certificate is under process, to claim Oasis scholarship.",
        bengaliStatement: "ওয়াসিস স্কলারশিপের জন্য জাতিগত পরিচিতি যাচাইয়ের উদ্দেশ্যে।",
        requiredProof: "Oasis portal temporary acknowledgement + Family caste proof.",
      },
      {
        category: "Academic Seat Reservation Verification",
        statement: "To authenticate scheduled caste / tribe category status during university or polytechnic counseling document verification.",
        bengaliStatement: "কলেজ বা বিশ্ববিদ্যালয়ে সংরক্ষিত আসনে ভর্তির সময় যাচাইয়ের জন্য।",
        requiredProof: "Counseling allotment letter + Family lineage proof.",
      },
    ],
  },
  {
    id: "unmarried",
    name: "Unmarried Certificate",
    bengaliName: "অবিবাহিত শংসাপত্র",
    icon: "💍",
    tag: "Defense & Statutory Clearance",
    summary:
      "Official certificate confirming the bachelorhood / spinsterhood / unmarried marital status of the citizen, backed by mandatory Gram Sansad Member declaration.",
    purposes: [
      {
        category: "Indian Army Agniveer Recruitment Rally",
        statement: "Mandatory document required at Indian Army Agniveer Recruitment Rally (Barrackpore / Kalyani) document screening counter.",
        bengaliStatement: "ভারতীয় সেনাবাহিনীর অগ্নিবীর র‍্যালিতে শারীরিক ও নথি পরীক্ষার সময় দাখিলের জন্য।",
        requiredProof: "Rally Admit Card + Class-X Admit Card (Age proof) + Gram Sansad Member Declaration.",
      },
      {
        category: "Paramilitary Forces (BSF / CISF / CRPF / SSB)",
        statement: "For submission during pre-enlistment verification and medical clearance for Central Armed Police Forces (CAPF).",
        bengaliStatement: "প্যারামিলিটারি বাহিনীতে (BSF, CISF, CRPF) যোগদানের পূর্বে অবিবাহিত প্রমাণ হিসেবে।",
        requiredProof: "SSC GD Constable Selection Letter + Age Proof + Member Declaration.",
      },
      {
        category: "West Bengal Police Constable Joining",
        statement: "For submission during Police Verification (VR) roll filling confirming unmarried status at time of joining.",
        bengaliStatement: "পশ্চিমবঙ্গ পুলিশ কনস্টেবল পদে যোগদানের পুলিশ ভেরিফিকেশনে দাখিলের উদ্দেশ্যে।",
        requiredProof: "WBPRB Merit List Allotment + Gram Sansad Declaration.",
      },
      {
        category: "Rupashree Prakalpa Pre-Marriage Clearance",
        statement: "For submission to Women & Child Development Dept / Hanskhali BDO office verifying unmarried status prior to marriage grant.",
        bengaliStatement: "রূপশ্রী প্রকল্পে বিয়ের আর্থিক অনুদানের জন্য অবিবাহিত স্ট্যাটাস প্রমাণের উদ্দেশ্যে।",
        requiredProof: "Marriage Invitation Card + Age proof (18+) + Gram Sansad Certificate.",
      },
      {
        category: "Special Marriage Act, 1954 Statutory Notice",
        statement: "For submission to Nadia Marriage Registrar Office under Section 5 of Special Marriage Act, 1954 for 30-day notice publication.",
        bengaliStatement: "স্পেশাল ম্যারেজ অ্যাক্ট অনুযায়ী বিবাহ নিবন্ধনের নোটিশ দাখিলের উদ্দেশ্যে।",
        requiredProof: "Age proof (21 for male, 18 for female) + Residential proof + Member Declaration.",
      },
      {
        category: "Foreign Student / Work Visa Bachelorhood Clearance",
        statement: "For presentation to foreign embassies and visa consulates as single-status certificate for overseas employment or study.",
        bengaliStatement: "বিদেশের ভিসা বা স্কলারশিপের জন্য সিঙ্গেল-স্ট্যাটাস প্রমাণের উদ্দেশ্যে।",
        requiredProof: "Valid Passport + Gram Sansad Declaration + Pradhan seal.",
      },
    ],
  },
];
