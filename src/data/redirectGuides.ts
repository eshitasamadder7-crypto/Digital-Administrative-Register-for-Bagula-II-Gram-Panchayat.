export interface RedirectWorkflowStep {
  step: number;
  title: string;
  bengaliTitle?: string;
  description: string;
  tips?: string;
}

export interface RedirectDocument {
  name: string;
  bengaliName?: string;
  mandatory: boolean;
  format: string;
  maxSize: string;
  details?: string;
}

export interface VideoGuideInfo {
  title: string;
  bengaliTitle?: string;
  channel: string;
  youtubeId?: string;
  youtubeUrl: string;
  duration?: string;
  highlights: string[];
}

export interface RedirectGuide {
  id: string;
  title: string;
  bengaliTitle: string;
  category: string;
  portalName: string;
  portalUrl: string;
  officialDept: string;
  description: string;
  bengaliDescription: string;
  regulatoryInfo?: string;
  turnaroundTime: string;
  validity?: string;
  feeInfo?: string;
  eligibility?: string;
  purposes?: string[];
  destinationType?: "INTERNAL_ROUTE" | "EXTERNAL_URL" | "DOCUMENT" | "WORKFLOW_STEP" | "NO_REDIRECT";
  faqs?: Array<{ question: string; answer: string }>;
  workflow: RedirectWorkflowStep[];
  documents: RedirectDocument[];
  downloadFormUrl?: string;
  downloadFormLabel?: string;
  videoGuide: VideoGuideInfo;
  localOfficeNotice: string;
}

export const REDIRECT_GUIDES: Record<string, RedirectGuide> = {
  "birth-new": {
    id: "birth-new",
    title: "New Birth Registration",
    bengaliTitle: "নতুন জন্ম নিবন্ধন (জন্ম-মৃত্যু তথ্য)",
    category: "Birth & Death Services",
    portalName: "Janma-Mrityu Tathya Portal (Dept. of Health & Family Welfare, Govt. of WB)",
    portalUrl: "https://janma-mrityutathya.wb.gov.in/#",
    officialDept: "Directorate of Health Services, Government of West Bengal",
    description: "Official registration of a child born within Bagula II Gram Panchayat jurisdiction or at local medical facilities within 21 days of birth as per Section 7/8 of the RBD Act, 1969.",
    bengaliDescription: "জন্মের ২১ দিনের মধ্যে বা পরবর্তী সময়ে সরকারি জন্ম-মৃত্যু তথ্য পোর্টালের মাধ্যমে শিশুর জন্ম নথিভুক্তকরণ এবং ডিজিটাল কিউআর কোডযুক্ত জন্ম শংসাপত্র সংগ্রহ।",
    regulatoryInfo: "Section 7/8 of the Registration of Births and Deaths Act, 1969 & West Bengal RBD Rules, 2000.",
    turnaroundTime: "7 to 15 working days following Sub-Registrar approval",
    validity: "Lifetime permanent civil identity document",
    feeInfo: "Free within 21 days; nominal late fee applies thereafter under Section 13.",
    downloadFormUrl: "https://dc.crsorgi.gov.in/assets/download/all_forms_CRS_2019_new.pdf",
    downloadFormLabel: "Download CRS Form 1 (Birth Reporting)",
    workflow: [
      {
        step: 1,
        title: "Collect Institutional / Domiciliary Proof",
        bengaliTitle: "ডেলিভারি স্লিপ বা হাসপাতালের নথি সংগ্রহ",
        description: "Obtain the official discharge summary / birth slip from Bagula Rural Hospital, Sub-District Hospital, or nursing home. For home births, obtain ANM/ASHA worker verification or Gram Panchayat member certificate.",
        tips: "Make sure parents' names on the hospital slip match their Aadhaar cards exactly."
      },
      {
        step: 2,
        title: "Access Janma-Mrityu Tathya & OTP Login",
        bengaliTitle: "মোবাইল ওটিপি যাচাই করে পোর্টালে লগইন",
        description: "Open the state portal, select 'Citizen Services' -> 'Birth' -> 'Apply for New Registration'. Enter your active Indian mobile number and verify via 6-digit OTP.",
        tips: "Use the parents' primary mobile number as application status and certificate download links will be SMS-linked."
      },
      {
        step: 3,
        title: "Enter Child & Parents' Details and Upload Documents",
        bengaliTitle: "ফর্ম পূরণ ও স্ক্যান করা কপি আপলোড",
        description: "Fill Child's Name, Gender, Date of Birth, Place of Birth (Ward/Village in Bagula II GP), Mother's & Father's Aadhaar numbers, and present/permanent address. Upload hospital birth slip and parent ID proofs.",
        tips: "Ensure scanned documents are crisp and under 250 KB in PDF/JPG format."
      },
      {
        step: 4,
        title: "Gram Panchayat Sub-Registrar Scrutiny",
        bengaliTitle: "বাগদা ২ নং গ্রাম পঞ্চায়েত যাচাইকরণ",
        description: "The application routes to Bagula II Gram Panchayat Sub-Registrar (Executive Assistant / Pradhan). The office reviews hospital registers and identity documents.",
        tips: "If any clarification is required, keep the Acknowledgment Number handy when visiting the GP office."
      },
      {
        step: 5,
        title: "Digital Signature & QR Certificate Download",
        bengaliTitle: "ডিজিটাল সার্টিফিকেট ডাউনলোড",
        description: "Upon approval, the Sub-Registrar digitally signs the certificate. You can instantly download the QR-enabled certificate from 'Track Application / Download Certificate' tab.",
        tips: "The downloaded PDF has a verifiable cryptographic QR code — no physical countersign is necessary."
      }
    ],
    documents: [
      { name: "Discharge Certificate / Hospital Birth Slip", bengaliName: "হাসপাতালের ডেলিভারি স্লিপ", mandatory: true, format: "PDF / JPG", maxSize: "250 KB", details: "Issued by Medical Officer / Hospital Superintendent" },
      { name: "Mother's Aadhaar Card / EPIC Card", bengaliName: "মায়ের আধার বা ভোটার কার্ড", mandatory: true, format: "PDF / JPG", maxSize: "250 KB" },
      { name: "Father's Aadhaar Card / EPIC Card", bengaliName: "বাবার আধার বা ভোটার কার্ড", mandatory: false, format: "PDF / JPG", maxSize: "250 KB" },
      { name: "Residential Proof in Bagula II GP", bengaliName: "স্থায়ী ঠিকানার প্রমাণপত্র", mandatory: true, format: "PDF / JPG", maxSize: "250 KB", details: "EPIC, Electricity Bill, or Panchayat Tax Receipt" }
    ],
    videoGuide: {
      title: "Step-by-Step: Birth Certificate Online Apply in West Bengal (Janma Mrityu Tathya)",
      bengaliTitle: "পশ্চিমবঙ্গে জন্ম সার্টিফিকেট অনলাইন আবেদন সম্পূর্ণ প্রক্রিয়া (ভিডিও গাইড)",
      channel: "Digital Seva Bangla & State e-Gov Guidance",
      youtubeId: "Ww7o6H4qX2g",
      youtubeUrl: "https://www.youtube.com/results?search_query=janma+mrityu+tathya+birth+certificate+online+apply+west+bengal",
      duration: "8 mins 45 secs",
      highlights: [
        "How to log in with mobile OTP on janma-mrityutathya.wb.gov.in",
        "Correct entry of child's name in English and Bengali",
        "Uploading hospital birth report and avoiding file size rejection",
        "Tracking status using the 15-digit Application Acknowledgment Number"
      ]
    },
    localOfficeNotice: "Bagula II Gram Panchayat Sub-Registrar handles verification for institutional and home births in Bagula II GP jurisdiction. Keep your ACK number ready."
  },

  "death-new": {
    id: "death-new",
    title: "New Death Registration",
    bengaliTitle: "নতুন মৃত্যু নিবন্ধন (জন্ম-মৃত্যু তথ্য)",
    category: "Birth & Death Services",
    portalName: "Janma-Mrityu Tathya Portal (Dept. of Health & Family Welfare, Govt. of WB)",
    portalUrl: "https://janma-mrityutathya.wb.gov.in/#",
    officialDept: "Directorate of Health Services, Government of West Bengal",
    description: "Official registration of a death occurring within Bagula II Gram Panchayat jurisdiction. Mandatory report within 21 days under the RBD Act, 1969.",
    bengaliDescription: "মৃত্যুর ২১ দিনের মধ্যে সরকারি জন্ম-মৃত্যু তথ্য পোর্টালে অনলাইন নথিভুক্তকরণ এবং শ্মশান/কবরস্থান ছাড়পত্র ও ডিজিটাল ডেথ সার্টিফিকেট সংগ্রহ।",
    regulatoryInfo: "Section 7/8 of the Registration of Births and Deaths Act, 1969 & West Bengal RBD Rules, 2000.",
    turnaroundTime: "5 to 10 working days following Sub-Registrar approval",
    validity: "Permanent legal death record",
    feeInfo: "Free within 21 days.",
    downloadFormUrl: "https://dc.crsorgi.gov.in/assets/download/all_forms_CRS_2019_new.pdf",
    downloadFormLabel: "Download CRS Form 2 (Death Reporting)",
    workflow: [
      {
        step: 1,
        title: "Obtain Medical Certification & Burning/Burial Ghat Receipt",
        bengaliTitle: "চিকিৎসক সার্টিফিকেট ও শ্মশান/কবরস্থান রশিদ",
        description: "Obtain Form 4/4A Cause of Death certificate from attending doctor or hospital, and cremation / burial receipt from registered ghat.",
        tips: "Ensure deceased person's name and date of death match doctor's certificate precisely."
      },
      {
        step: 2,
        title: "Log in to Janma-Mrityu Tathya Portal",
        bengaliTitle: "পোর্টালে ওটিপি দিয়ে লগইন",
        description: "Visit the official portal, navigate to 'Citizen Services' -> 'Death' -> 'Apply for New Registration'. Enter mobile number and verify OTP.",
        tips: "Use family member's or next of kin's registered mobile number."
      },
      {
        step: 3,
        title: "Fill Deceased Information & Informant Details",
        bengaliTitle: "মৃত ব্যক্তির তথ্য ও আবেদনকারীর সম্পর্ক পূরণ",
        description: "Enter Deceased Name, Age, Gender, Date & Place of Death, Father's / Husband's / Mother's name, and Informant address. Upload Doctor's certificate, burning ghat slip, and deceased Aadhaar.",
        tips: "Scan all attachments clearly in PDF or JPG format under 250 KB."
      },
      {
        step: 4,
        title: "Panchayat Sub-Registrar Verification",
        bengaliTitle: "গ্রাম পঞ্চায়েত যাচাই ও অনুমোদন",
        description: "The Sub-Registrar of Bagula II GP verifies the record against local death registers and hospital notifications.",
        tips: "Carry original cremation receipts if physical inspection is requested by the office."
      },
      {
        step: 5,
        title: "Download Digitally Signed Death Certificate",
        bengaliTitle: "ডিজিটাল ডেথ সার্টিফিকেট ডাউনলোড",
        description: "Upon approval, download the QR-coded official Death Certificate for banking, pension, land inheritance (Warish), and legal settlements.",
        tips: "Certificate is accepted by all Indian banks, LIC, courts, and land revenue offices."
      }
    ],
    documents: [
      { name: "Medical Certificate of Cause of Death (Doctor / Hospital)", bengaliName: "চিকিৎসকের ডেথ সার্টিফিকেট", mandatory: true, format: "PDF / JPG", maxSize: "250 KB" },
      { name: "Cremation / Burial Ground (Ghat) Receipt", bengaliName: "শ্মশান বা কবরস্থান রশিদ", mandatory: true, format: "PDF / JPG", maxSize: "250 KB" },
      { name: "Aadhaar / Voter ID of Deceased", bengaliName: "মৃত ব্যক্তির আধার বা ভোটার কার্ড", mandatory: true, format: "PDF / JPG", maxSize: "250 KB" },
      { name: "Aadhaar / Identity Proof of Informant / Next of Kin", bengaliName: "আবেদনকারীর আধার কার্ড", mandatory: true, format: "PDF / JPG", maxSize: "250 KB" }
    ],
    videoGuide: {
      title: "How to Apply for Death Certificate Online in West Bengal (Janma Mrityu Tathya)",
      bengaliTitle: "পশ্চিমবঙ্গে অনলাইনে ডেথ সার্টিফিকেট আবেদন পদ্ধতি (ভিডিও গাইড)",
      channel: "Bangla Tech & e-Governance Portal Guide",
      youtubeId: "vB6N0yK2E8k",
      youtubeUrl: "https://www.youtube.com/results?search_query=janma+mrityu+tathya+death+certificate+online+apply+west+bengal",
      duration: "7 mins 20 secs",
      highlights: [
        "Doctor's certificate and cremation receipt upload rules",
        "Avoiding spelling errors in legal heir / informant details",
        "Downloading digitally signed certificate with QR code"
      ]
    },
    localOfficeNotice: "For deaths occurred at home in Bagula II GP area, ensure cremation receipt or burial committee certificate is signed before applying."
  },

  "birth-death-correction": {
    id: "birth-death-correction",
    title: "Correction in Birth / Death Certificate",
    bengaliTitle: "জন্ম ও মৃত্যু শংসাপত্র তথ্য সংশোধন",
    category: "Birth & Death Services",
    portalName: "Janma-Mrityu Tathya Portal (Dept. of Health & Family Welfare, Govt. of WB)",
    portalUrl: "https://janma-mrityutathya.wb.gov.in/#",
    officialDept: "Directorate of Health Services, Government of West Bengal",
    description: "Correction of typographical errors, spelling mistakes in applicant or parent names, dates, or address in previously issued digital birth and death certificates.",
    bengaliDescription: "পূর্বে ইস্যুকৃত জন্ম বা মৃত্যু সার্টিফিকেটে নাম, বানান, জন্মতারিখ বা ঠিকানার ভুল সংশোধন করার অনলাইন সরকারি প্রক্রিয়া।",
    regulatoryInfo: "Section 15 of the Registration of Births and Deaths Act, 1969 & Rule 11 of WB RBD Rules, 2000.",
    turnaroundTime: "15 to 30 working days (requires Sub-Registrar / District Registrar order)",
    validity: "Permanent corrected record",
    feeInfo: "Prescribed statutory correction fee applies.",
    downloadFormUrl: "https://dc.crsorgi.gov.in/assets/download/all_forms_CRS_2019_new.pdf",
    downloadFormLabel: "Download CRS Correction Guidelines",
    workflow: [
      {
        step: 1,
        title: "Identify Discrepancy & Gather Primary Evidence",
        bengaliTitle: "ভুল চিহ্নিতকরণ ও সহায়ক প্রমাণপত্র সংগ্রহ",
        description: "Locate the exact discrepancy on your current certificate. Gather supporting documents proving correct data (e.g. Madhyamik Admit Card, Passport, Parents' Marriage Certificate, Land Deed).",
        tips: "Substantial name changes require a 1st Class Judicial Magistrate Affidavit."
      },
      {
        step: 2,
        title: "Log in & Select 'Correction' on the Portal",
        bengaliTitle: "পোর্টালে গিয়ে সংশোধন বিকল্প নির্বাচন",
        description: "Go to 'Citizen Services' -> 'Birth' / 'Death' -> 'Apply for Correction'. Enter Certificate Number and Mobile Number to receive OTP.",
        tips: "The mobile number should ideally match the one used during original registration, or provide identity proof to update."
      },
      {
        step: 3,
        title: "Enter Corrected Fields & Upload Supporting Proofs",
        bengaliTitle: "সঠিক তথ্য পূরণ ও প্রামাণ্য নথি আপলোড",
        description: "Specify the exact fields requiring correction. Upload current incorrect certificate, First Class Magistrate Affidavit / Gazetted officer certificate, and school / identity proofs.",
        tips: "Each PDF/JPG must be legible and strictly within the file limit (under 250 KB)."
      },
      {
        step: 4,
        title: "Sub-Registrar / BDO Inquiry & Order",
        bengaliTitle: "উপ-নিবন্ধক ও প্রশাসনিক অনুমোদন",
        description: "Under Section 15 of the RBD Act, Sub-Registrar conducts summary inquiry, checks the original paper Volume Register in Bagula II GP, and issues correction order.",
        tips: "Visit the Bagula II GP office with original volume reference if the record is prior to 2016."
      },
      {
        step: 5,
        title: "Download Corrected Certificate",
        bengaliTitle: "সংশোধিত নতুন সার্টিফিকেট ডাউনলোড",
        description: "Once approved, download the fresh QR-coded certificate bearing the updated details and correction endorsement.",
        tips: "Previous certificate becomes void and the corrected QR code is updated on the state database."
      }
    ],
    documents: [
      { name: "Existing Birth / Death Certificate Copy", bengaliName: "বর্তমান সার্টিফিকেটের কপি", mandatory: true, format: "PDF / JPG", maxSize: "250 KB" },
      { name: "1st Class Judicial Magistrate / Notary Affidavit", bengaliName: "জুডিশিয়াল ম্যাজিস্ট্রেট এফিডেভিট", mandatory: true, format: "PDF", maxSize: "500 KB", details: "Detailing exact mistake and correct name/date" },
      { name: "School Admit Card / Board Marksheet (for age/name proof)", bengaliName: "মাধ্যমিক এডমিট বা মার্কশিট", mandatory: true, format: "PDF / JPG", maxSize: "250 KB" },
      { name: "Parents' Aadhaar & Voter Card Copies", bengaliName: "পিতা-মাতার আধার ও ভোটার কার্ড", mandatory: true, format: "PDF / JPG", maxSize: "250 KB" }
    ],
    videoGuide: {
      title: "How to Correct Birth & Death Certificate Details Online in West Bengal",
      bengaliTitle: "জন্ম সার্টিফিকেটে নাম ও বয়স সংশোধন করার নিয়ম (ভিডিও গাইড)",
      channel: "Technical Rayn & WB e-Services",
      youtubeId: "T7d9Qp7ZkYo",
      youtubeUrl: "https://www.youtube.com/results?search_query=janma+mrityu+tathya+birth+certificate+correction+online+west+bengal",
      duration: "9 mins 15 secs",
      highlights: [
        "Difference between clerical correction vs substantial name change",
        "Format of Magistrate affidavit required under Section 15",
        "Step-by-step submission on janma-mrityutathya portal"
      ]
    },
    localOfficeNotice: "For records registered at Bagula II GP before 2016, original paper Volume Register cross-verification is mandatory at the GP office."
  },

  "birth-death-delayed": {
    id: "birth-death-delayed",
    title: "Delayed Birth / Death Registration",
    bengaliTitle: "বিলম্বিত জন্ম ও মৃত্যু নিবন্ধন (Delayed Registration)",
    category: "Birth & Death Services",
    portalName: "Janma-Mrityu Tathya Portal (Dept. of Health & Family Welfare, Govt. of WB)",
    portalUrl: "https://janma-mrityutathya.wb.gov.in/#",
    officialDept: "Directorate of Health Services & Home Dept., Govt. of West Bengal",
    description: "Registration of births or deaths not reported within one year of occurrence. Requires Non-Availability Certificate (Form 10) and Order from Executive Magistrate / SDO under Section 13(3) of RBD Act, 1969.",
    bengaliDescription: "জন্মের বা মৃত্যুর ১ বছরের বেশি সময় পার হয়ে গেলে সাব-ডিভিশনাল ম্যাজিস্ট্রেট (SDO) বা ফার্স্ট ক্লাস ম্যাজিস্ট্রেটের নির্দেশে দেরিতে নথিভুক্তকরণের সরকারি প্রক্রিয়া।",
    regulatoryInfo: "Section 13(3) of the Registration of Births and Deaths Act, 1969 & Rule 9 of WB RBD Rules, 2000.",
    turnaroundTime: "30 to 60 days (involves Magistrate court order and GP register search)",
    validity: "Permanent valid certificate",
    feeInfo: "Magistrate court fees and prescribed statutory late fee.",
    downloadFormUrl: "https://dc.crsorgi.gov.in/assets/download/all_forms_CRS_2019_new.pdf",
    downloadFormLabel: "Download CRS Form 10 (Non-Availability Format)",
    workflow: [
      {
        step: 1,
        title: "Obtain Non-Availability Certificate (Form 10)",
        bengaliTitle: "গ্রাম পঞ্চায়েত থেকে ফর্ম ১০ (অপ্রাপ্যতা শংসাপত্র) সংগ্রহ",
        description: "Apply to Bagula II Gram Panchayat to search volume registers. If no prior registration exists, the Sub-Registrar issues Form 10 Non-Availability Certificate.",
        tips: "This certifies that the birth/death was not previously registered in Bagula II GP."
      },
      {
        step: 2,
        title: "Obtain SDO / Executive Magistrate Court Order",
        bengaliTitle: "এসডিও বা ম্যাজিস্ট্রেটের নির্দেশনামা গ্রহণ",
        description: "File an application before the Sub-Divisional Officer (SDO) Ranaghat / Executive Magistrate along with school admit card, hospital papers, local inquiry report, and affidavit.",
        tips: "The Magistrate will issue a formal order under Section 13(3) directing the Sub-Registrar to register."
      },
      {
        step: 3,
        title: "Online Submission on Janma-Mrityu Tathya",
        bengaliTitle: "পোর্টালে বিলম্বিত নিবন্ধনের আবেদন দাখিল",
        description: "Select 'Delayed Registration' under Citizen Services. Upload SDO order copy, Form 10, doctor/hospital proof, school admit card, and parent identity documents.",
        tips: "Ensure the Magistrate Order number and date are entered accurately."
      },
      {
        step: 4,
        title: "GP Sub-Registrar Endorsement & Digital Signing",
        bengaliTitle: "গ্রাম পঞ্চায়েত উপ-নিবন্ধক স্বাক্ষর",
        description: "Bagula II Gram Panchayat Sub-Registrar verifies court order authenticity and executes digital registration on the portal.",
        tips: "Produce original hard copy of Magistrate order at GP office for verification."
      },
      {
        step: 5,
        title: "Download Digitally Signed Certificate",
        bengaliTitle: "ডিজিটাল সার্টিফিকেট ডাউনলোড",
        description: "Download the final QR-enabled Certificate containing delayed registration order reference.",
        tips: "Accepted universally for passport, jobs, admissions, and legal documentation."
      }
    ],
    documents: [
      { name: "Order of SDO / Executive Magistrate under Sec 13(3)", bengaliName: "এসডিও বা ম্যাজিস্ট্রেটের অর্ডার কপি", mandatory: true, format: "PDF", maxSize: "500 KB" },
      { name: "Non-Availability Certificate (Form 10) from Bagula II GP", bengaliName: "গ্রাম পঞ্চায়েতের অপ্রাপ্যতা শংসাপত্র", mandatory: true, format: "PDF / JPG", maxSize: "250 KB" },
      { name: "School Certificate / Board Admit Card (Age Proof)", bengaliName: "স্কুল সার্টিফিকেট বা অ্যাডমিট কার্ড", mandatory: true, format: "PDF / JPG", maxSize: "250 KB" },
      { name: "Hospital Slip / Doctor's Certificate / ANM Report", bengaliName: "হাসপাতাল বা চিকিৎসকের প্রমাণ", mandatory: true, format: "PDF / JPG", maxSize: "250 KB" },
      { name: "Parents' Aadhaar & Voter Card Copies", bengaliName: "পিতা-মাতার আধার ও ভোটার কার্ড", mandatory: true, format: "PDF / JPG", maxSize: "250 KB" }
    ],
    videoGuide: {
      title: "Delayed Birth Certificate Online Apply West Bengal (SDO Order & Form 10 Process)",
      bengaliTitle: "দেরিতে জন্ম সার্টিফিকেট আবেদনের সঠিক নিয়ম ও ম্যাজিস্ট্রেটের অর্ডার (ভিডিও গাইড)",
      channel: "Digital Seva Bangla & Legal Aid West Bengal",
      youtubeId: "vB6N0yK2E8k",
      youtubeUrl: "https://www.youtube.com/results?search_query=delayed+birth+certificate+online+apply+west+bengal+janma+mrityu+tathya",
      duration: "11 mins 30 secs",
      highlights: [
        "How to apply for Form 10 Non-Availability Certificate at Panchayat",
        "Getting an Executive Magistrate / SDO court order under Sec 13(3)",
        "Uploading court order on Janma-Mrityu Tathya for digital approval"
      ]
    },
    localOfficeNotice: "Form 10 search requires manual Volume verification at Bagula II Gram Panchayat office. Submit your search petition at the GP counter first."
  },

  "birth-digitalization": {
    id: "birth-digitalization",
    title: "Legacy Birth Certificate Digitization (Pre-2016)",
    bengaliTitle: "পুরোনো হাতে লেখা জন্ম শংসাপত্র ডিজিটালাইজেশন",
    category: "Panchayat Digitization Drive",
    portalName: "Bagula II GP Digitization Pre-Verification Tool",
    portalUrl: "https://bagulabirth.lovable.app",
    officialDept: "Bagula II Gram Panchayat, Nadia, West Bengal",
    description: "Decentralized digitization pre-verification tool for converting handwritten birth certificates issued before 2016 into modern, QR-coded digital records under West Bengal SBHI SOP Case-I.",
    bengaliDescription: "২০১৬ সালের আগের পুরোনো হাতে লেখা জন্ম সার্টিফিকেট যাচাই করে ডিজিটাল কিউআর কোডযুক্ত করার জন্য সাইবার ক্যাফে ও নাগরিকদের অনলাইন আবেদন প্রি-ভেরিফিকেশন ব্যবস্থা।",
    regulatoryInfo: "Section 12/17 of RBD Act, 1969 & West Bengal SBHI Digitization SOP Case-I.",
    turnaroundTime: "3 to 7 working days following GP Volume comparison",
    validity: "Permanent QR-verified state certificate",
    feeInfo: "Nil / As per state digitization guidelines.",
    downloadFormUrl: "/birth-digitization-form",
    downloadFormLabel: "Open & Print A4 Application Form (আবেদনপত্র)",
    workflow: [
      {
        step: 1,
        title: "Select Digitization Path (Path A vs Path B)",
        bengaliTitle: "আবেদনের ধরণ নির্বাচন (মূল কপি আছে / হারিয়ে গেছে)",
        description: "Choose Path A if you possess an intact, legible physical copy of your old handwritten certificate. Choose Path B if the physical certificate was lost/damaged (requires Police GD).",
        tips: "Path A allows direct ink-matching against volume registers."
      },
      {
        step: 2,
        title: "Fill Applicant Details & Mother's Identity",
        bengaliTitle: "সন্তান ও মায়ের আধার তথ্য পূরণ",
        description: "Enter Full Name (forced uppercase), Date of Birth, Place of Birth in Bagula II GP, Mother's Name (mandatory), Mother's Aadhaar/EPIC number, and Father's details.",
        tips: "Names must match old certificate letters precisely to avoid spelling rejection."
      },
      {
        step: 3,
        title: "Upload Scanned Copies (Strict Size Limits)",
        bengaliTitle: "নির্ধারিত সাইজে স্ক্যান ফাইল আপলোড",
        description: "Upload old manual certificate (<100 KB JPG/PDF), Mother's ID proof (<50 KB), or Police GD (<200 KB) for lost certificates.",
        tips: "Ensure registration number and date on the seal are clearly readable."
      },
      {
        step: 4,
        title: "Generate Pre-Verification Summary Sheet",
        bengaliTitle: "প্রি-ভেরিফিকেশন সামারি শিট প্রিন্ট",
        description: "Print the official 'Bagula II GP Pre-Verification Summary Sheet' with physical checklist and carry it to the Gram Panchayat office.",
        tips: "The print sheet includes volume search codes for fast counter clearance."
      },
      {
        step: 5,
        title: "GP Sub-Registrar Ink Match & Final Digital Signing",
        bengaliTitle: "পঞ্চায়েত ভলিউম খাতা মিলিয়ে ডিজিটাল স্বাক্ষর",
        description: "The Sub-Registrar inspects the physical book, matches ink and seal, and approves digital certificate issuance on the state portal.",
        tips: "New QR certificate replaces the manual paper copy with 100% legal validity."
      }
    ],
    documents: [
      { name: "Original Handwritten Birth Certificate Scan", bengaliName: "পুরোনো হাতে লেখা সার্টিফিকেটের কপি", mandatory: true, format: "PDF / JPG", maxSize: "100 KB", details: "For Path A (Intact records)" },
      { name: "Mother's Aadhaar / EPIC Identity Proof", bengaliName: "মায়ের আধার বা ভোটার কার্ড", mandatory: true, format: "PDF / JPG", maxSize: "50 KB" },
      { name: "Police General Diary (GD) Loss Report", bengaliName: "থানার জিডি কপি", mandatory: false, format: "PDF / JPG", maxSize: "200 KB", details: "Mandatory for Path B (Lost / Damaged)" },
      { name: "Secondary Age Proof (Admit Card / Marksheet)", bengaliName: "অ্যাডমিট বা মার্কশিট", mandatory: false, format: "PDF / JPG", maxSize: "200 KB" }
    ],
    videoGuide: {
      title: "How to Digitize Old Handwritten Birth Certificate in West Bengal",
      bengaliTitle: "পুরোনো জন্ম সার্টিফিকেট ডিজিটাল করার নিয়ম ও এসওপি (ভিডিও গাইড)",
      channel: "Bagula II Cyber Cafe Network & VLE Support",
      youtubeId: "Ww7o6H4qX2g",
      youtubeUrl: "https://www.youtube.com/results?search_query=how+to+digitize+old+birth+certificate+west+bengal+sop",
      duration: "6 mins 40 secs",
      highlights: [
        "Difference between Path A (legible copy) and Path B (Police GD lost report)",
        "Zero-retention data privacy standards for public cyber cafe computers",
        "Generating printable summary sheet for Bagula II Gram Panchayat counter"
      ]
    },
    localOfficeNotice: "Authorized for Bagula II GP residents. After filling, bring your original paper book copy to the GP office for register ink-and-stamp matching."
  },

  "crs-forms": {
    id: "crs-forms",
    title: "Civil Registration System (CRS) Official Forms",
    bengaliTitle: "সিআরএস অফিসিয়াল ফর্ম ডাউনলোড (ফর্ম ১, ফর্ম ২, ফর্ম ১০)",
    category: "Forms & Downloads",
    portalName: "Office of the Registrar General, India (CRSORGI)",
    portalUrl: "https://dc.crsorgi.gov.in/assets/download/all_forms_CRS_2019_new.pdf",
    officialDept: "Ministry of Home Affairs, Govt. of India / Directorate of Health Services, WB",
    description: "Official statutory reporting forms under the Registration of Births and Deaths Rules for reporting births (Form 1), deaths (Form 2), stillbirths (Form 3), medical certificates (Form 4/4A), and non-availability (Form 10).",
    bengaliDescription: "জন্ম ও মৃত্যু নিবন্ধনের জন্য ভারত সরকার ও পশ্চিমবঙ্গ সরকার অনুমোদিত অফিসিয়াল ফর্ম সংকলন। অনলাইনে আবেদনের পূর্বে এই ফর্মগুলো পূরণ করা আবশ্যক।",
    regulatoryInfo: "Registration of Births and Deaths Act, 1969 & Central Model Rules 2019.",
    turnaroundTime: "Immediate PDF download",
    validity: "Official statutory document format",
    feeInfo: "Free to download and use.",
    downloadFormUrl: "https://dc.crsorgi.gov.in/assets/download/all_forms_CRS_2019_new.pdf",
    downloadFormLabel: "Download Complete CRS Forms PDF (2019 Gazette)",
    workflow: [
      {
        step: 1,
        title: "Identify the Required Statutory Form",
        bengaliTitle: "প্রয়োজনীয় ফর্মটি চিহ্নিত করুন",
        description: "Form 1: Birth Reporting; Form 2: Death Reporting; Form 3: Still Birth; Form 4/4A: Cause of Death; Form 10: Non-Availability Certificate.",
        tips: "Review which form corresponds to your registration circumstance."
      },
      {
        step: 2,
        title: "Download and Print on Clean A4 Paper",
        bengaliTitle: "ডাউনলোড ও এ-ফোর কাগজে প্রিন্ট করুন",
        description: "Click proceed to download the complete 32-page bilingual CRS Forms booklet directly from the Registrar General of India repository.",
        tips: "Print only the specific form pages required (e.g. Pages 1-2 for Form 1)."
      },
      {
        step: 3,
        title: "Fill in Capital Letters & Obtain Signatures",
        bengaliTitle: "বড় হাতের অক্ষরে পূরণ ও স্বাক্ষর সংগ্রহ",
        description: "Fill all columns with black/blue ballpoint pen in BLOCK LETTERS. Obtain signatures of parents / informants / medical attendant.",
        tips: "Signatures must match Aadhaar/EPIC card specimen signatures."
      },
      {
        step: 4,
        title: "Scan and Attach on State Portal",
        bengaliTitle: "স্ক্যান করে পোর্টাল ও পঞ্চায়েতে জমা",
        description: "Scan the signed form along with supporting proof for online upload on Janma-Mrityu Tathya or physical submission at Bagula II GP counter.",
        tips: "Keep the original physical form safe in your home records."
      }
    ],
    documents: [
      { name: "Government Photo ID of Informant / Applicant", bengaliName: "আবেদনকারীর সচিত্র পরিচয়পত্র", mandatory: true, format: "PDF / Hard Copy", maxSize: "250 KB" },
      { name: "Hospital Slip or Medical Attendant Report", bengaliName: "হাসপাতাল বা চিকিৎসকের রিপোর্ট", mandatory: true, format: "PDF / Hard Copy", maxSize: "250 KB" }
    ],
    videoGuide: {
      title: "How to Fill CRS Birth & Death Registration Forms (Form 1, 2, 4A & 10)",
      bengaliTitle: "সিআরএস জন্ম ও মৃত্যু ফর্ম সঠিকভাবে পূরণ করার নিয়ম (ভিডিও গাইড)",
      channel: "Civil Registration System Helpdesk",
      youtubeId: "Ww7o6H4qX2g",
      youtubeUrl: "https://www.youtube.com/results?search_query=how+to+fill+crs+birth+death+registration+forms",
      duration: "5 mins 50 secs",
      highlights: [
        "Which form to use for institutional vs home births",
        "Mandatory columns: Parents' nationality, religion, and permanent address",
        "Signatures and official seal requirements"
      ]
    },
    localOfficeNotice: "Physical CRS forms are also available free of cost at the Bagula II Gram Panchayat Citizen Service Counter during office hours."
  },

  "wbpms-residential": {
    id: "wbpms-residential",
    title: "Residential Certificate (WBPMS)",
    bengaliTitle: "বাসস্থান প্রমাণপত্র (WBPMS পার্টনার পোর্টাল)",
    category: "Panchayat e-Certificates",
    portalName: "WBPMS Citizen Portal (Dept. of Panchayat & Rural Development, Govt. of WB)",
    portalUrl: "https://wbpms.in/citizen/",
    officialDept: "Panchayat & Rural Development Department, Government of West Bengal",
    description: "Official certificate issued by Bagula II Gram Panchayat certifying that the applicant is a bona fide resident of a specific village/ward within this Gram Panchayat.",
    bengaliDescription: "বাগদা ২ নং গ্রাম পঞ্চায়েতের স্থায়ী বাসিন্দা হিসেবে পঞ্চায়েত প্রধানের স্বাক্ষরিত ডিজিটাল বাসস্থান প্রমাণপত্র। চাকরি, ভর্তি, পাসপোর্ট ও ব্যাংকিং কাজের জন্য প্রয়োজনীয়।",
    regulatoryInfo: "West Bengal Panchayat Act, 1973 & WBPMS Parichay Rules.",
    turnaroundTime: "Within 7 working days",
    validity: "6 months from the date of issue",
    feeInfo: "Nominal online service charge as prescribed by WB PRD.",
    workflow: [
      {
        step: 1,
        title: "Prepare Required Documents & Photos",
        bengaliTitle: "ছবি ও নথি প্রস্তুত করুন",
        description: "Keep 1 passport-size color photograph in JPG format (<100 KB) and 2 identity & address proof documents in PDF format (<2 MB each).",
        tips: "Ensure recent tax receipt of Bagula II Gram Panchayat is up-to-date."
      },
      {
        step: 2,
        title: "Register / Log in to WBPMS Citizen Portal",
        bengaliTitle: "WBPMS পোর্টালে মোবাইল দিয়ে লগইন",
        description: "Open wbpms.in/citizen/, register with your mobile number, verify OTP, and create your citizen dashboard profile.",
        tips: "Ensure your mobile number is kept active for SMS updates and certificate OTP."
      },
      {
        step: 3,
        title: "Select Bagula II GP & Submit Application",
        bengaliTitle: "বাগদা ২ নং গ্রাম পঞ্চায়েত নির্বাচন ও ফর্ম পূরণ",
        description: "Choose District: Nadia -> Block: Hanskhali -> Gram Panchayat: Bagula II. Select 'Residential Certificate', fill personal and residential address details, and upload documents.",
        tips: "Double-check village name (e.g. Bagula Collegepara, Muraghacha, Bathanpara) and Ward number."
      },
      {
        step: 4,
        title: "Inquiry & Verification by Gram Panchayat Staff",
        bengaliTitle: "গ্রাম পঞ্চায়েত যাচাইকরণ",
        description: "Nirman Sahayak / Executive Assistant reviews tax records and electoral roll to confirm residency.",
        tips: "The portal typically completes this within 3 to 7 working days."
      },
      {
        step: 5,
        title: "Pradhan Digital Approval & Certificate Download",
        bengaliTitle: "প্রধানের ডিজিটাল স্বাক্ষর ও সার্টিফিকেট ডাউনলোড",
        description: "Once approved by GP Pradhan, download the digitally signed certificate with QR code directly from your WBPMS citizen dashboard.",
        tips: "Contains cryptographic QR verification valid across all government and private institutions."
      }
    ],
    documents: [
      { name: "Applicant Passport Size Photograph", bengaliName: "পাসপোর্ট সাইজ ছবি", mandatory: true, format: "JPG", maxSize: "100 KB" },
      { name: "Aadhaar Card / Voter ID (EPIC)", bengaliName: "আধার বা ভোটার কার্ড", mandatory: true, format: "PDF", maxSize: "2 MB" },
      { name: "Current Financial Year GP Tax Receipt / Land Deed", bengaliName: "চলতি বছরের পঞ্চায়েত ট্যাক্স রশিদ / পরচা", mandatory: true, format: "PDF", maxSize: "2 MB" },
      { name: "Ration Card (NFSA/RKSY)", bengaliName: "রেশন কার্ড", mandatory: false, format: "PDF", maxSize: "2 MB" }
    ],
    videoGuide: {
      title: "How to Apply Panchayat Residential Certificate Online in West Bengal (WBPMS)",
      bengaliTitle: "পঞ্চায়েত রেসিডেনশিয়াল সার্টিফিকেট অনলাইন আবেদন (ভিডিও গাইড)",
      channel: "Digital Seva Bangla & Technical Rayn",
      youtubeId: "n0v_M6eN7cQ",
      youtubeUrl: "https://www.youtube.com/results?search_query=how+to+apply+panchayat+residential+certificate+online+west+bengal+wbpms",
      duration: "8 mins 12 secs",
      highlights: [
        "Citizen registration and mobile OTP on wbpms.in/citizen",
        "Selecting Nadia -> Hanskhali -> Bagula II Gram Panchayat",
        "Document upload guidelines (JPG photo max 100KB, PDF max 2MB)",
        "Downloading digitally signed QR certificate"
      ]
    },
    localOfficeNotice: "Bagula II Gram Panchayat requires the current financial year tax clearance receipt for prompt approval."
  },

  "wbpms-income": {
    id: "wbpms-income",
    title: "Income Certificate (WBPMS)",
    bengaliTitle: "আয় প্রমাণপত্র (WBPMS পার্টনার পোর্টাল)",
    category: "Panchayat e-Certificates",
    portalName: "WBPMS Citizen Portal (Dept. of Panchayat & Rural Development, Govt. of WB)",
    portalUrl: "https://wbpms.in/citizen/",
    officialDept: "Panchayat & Rural Development Department, Government of West Bengal",
    description: "Official declaration of family annual income issued by Bagula II Gram Panchayat Pradhan for scholarships (Swami Vivekananda, Kanyashree, Aikyashree), student loans, and government concessions.",
    bengaliDescription: "স্কলারশিপ, কন্যাশ্রী, ঐক্যশ্রী ও ছাত্র ঋণের জন্য গ্রাম পঞ্চায়েত প্রধান স্বাক্ষরিত বার্ষিক আয়ের ডিজিটাল সরকারি প্রমাণপত্র।",
    regulatoryInfo: "West Bengal Panchayat Act, 1973 & State Scholarship Verification Guidelines.",
    turnaroundTime: "Within 7 working days",
    validity: "Valid for current financial year (6 months)",
    feeInfo: "Nominal online service fee.",
    workflow: [
      {
        step: 1,
        title: "Calculate Annual Income & Collect Income Proof",
        bengaliTitle: "বার্ষিক আয় নির্ধারণ ও প্রমাণপত্র সংগ্রহ",
        description: "Gather salary slips, employer certificate, agricultural land income record, or self-declaration counter-signed by local member.",
        tips: "Ensure income declared matches scholarship eligibility thresholds."
      },
      {
        step: 2,
        title: "Log in to WBPMS Citizen Portal",
        bengaliTitle: "WBPMS পোর্টালে লগইন",
        description: "Visit wbpms.in/citizen/, log in using mobile OTP, and navigate to 'Apply for Services' -> 'Income Certificate'.",
        tips: "Keep your photograph and documents ready in correct formats."
      },
      {
        step: 3,
        title: "Enter Occupation Details & Upload Supporting Proofs",
        bengaliTitle: "পেশা ও আয়ের বিবরণ পূরণ ও আপলোড",
        description: "Enter source of income, annual amount in figures & words, and purpose (e.g. Scholarship). Upload photo (<100KB JPG) and 2 PDF proofs (<2MB each).",
        tips: "Upload Aadhaar card and salary slip / panchayat tax receipt."
      },
      {
        step: 4,
        title: "Verification by Bagula II GP Authority",
        bengaliTitle: "গ্রাম পঞ্চায়েত যাচাইকরণ",
        description: "The application is verified against local household economic survey and tax assessment registers.",
        tips: "Takes 3 to 7 working days on average."
      },
      {
        step: 5,
        title: "Download Digitally Signed Income Certificate",
        bengaliTitle: "ডিজিটাল আয় সার্টিফিকেট ডাউনলোড",
        description: "Download the digitally signed certificate containing official QR code directly from your dashboard.",
        tips: "Accepted on Bikash Bhavan, SVMCM, NSP, and OASIS portals without manual sign-off."
      }
    ],
    documents: [
      { name: "Applicant Passport Size Photograph", bengaliName: "পাসপোর্ট ছবি", mandatory: true, format: "JPG", maxSize: "100 KB" },
      { name: "Aadhaar Card / Voter ID", bengaliName: "আধার বা ভোটার কার্ড", mandatory: true, format: "PDF", maxSize: "2 MB" },
      { name: "Income Proof / Salary Slip / Income Self Declaration", bengaliName: "বেতন স্লিপ বা আয় সংক্রান্ত স্ব-ঘোষণা", mandatory: true, format: "PDF", maxSize: "2 MB" },
      { name: "Current Year GP Property / Household Tax Receipt", bengaliName: "চলতি বছরের পঞ্চায়েত ট্যাক্স রশিদ", mandatory: true, format: "PDF", maxSize: "2 MB" }
    ],
    videoGuide: {
      title: "How to Apply for Panchayat Income Certificate Online in West Bengal (WBPMS)",
      bengaliTitle: "অনলাইনে গ্রাম পঞ্চায়েত ইনকাম সার্টিফিকেট আবেদন করার সহজ নিয়ম (ভিডিও গাইড)",
      channel: "Digital Seva Bangla & Mondal Cyber Cafe",
      youtubeId: "q6h3K7x_J9w",
      youtubeUrl: "https://www.youtube.com/results?search_query=how+to+apply+panchayat+income+certificate+online+west+bengal+wbpms",
      duration: "7 mins 45 secs",
      highlights: [
        "Filling accurate income amount for scholarship portals",
        "Uploading income self-declaration and local member endorsement",
        "Downloading digitally signed QR certificate for SVMCM / Kanyashree"
      ]
    },
    localOfficeNotice: "For scholarship purposes, ensure the student's name and guardian's name match educational board admit cards exactly."
  },

  "wbpms-character": {
    id: "wbpms-character",
    title: "Character Certificate (WBPMS)",
    bengaliTitle: "চারিত্রিক সনদপত্র (WBPMS পার্টনার পোর্টাল)",
    category: "Panchayat e-Certificates",
    portalName: "WBPMS Citizen Portal (Dept. of Panchayat & Rural Development, Govt. of WB)",
    portalUrl: "https://wbpms.in/citizen/",
    officialDept: "Panchayat & Rural Development Department, Government of West Bengal",
    description: "Official attestation of moral character and conduct issued by Bagula II Gram Panchayat Pradhan for police verification, government job appointments, defense recruitment, and higher education.",
    bengaliDescription: "সরকারি চাকরি, পুলিশ ভেরিফিকেশন, সেনাবাহিনী নিয়োগ বা ভর্তির জন্য পঞ্চায়েত প্রধানের স্বাক্ষরিত চারিত্রিক সনদপত্র।",
    regulatoryInfo: "West Bengal Panchayat Act, 1973 & Public Verification Guidelines.",
    turnaroundTime: "Within 7 working days",
    validity: "6 months from date of issue",
    feeInfo: "Nominal online fee.",
    workflow: [
      {
        step: 1,
        title: "Collect Identification Proofs",
        bengaliTitle: "পরিচয়পত্র সংগ্রহ",
        description: "Keep 1 passport-size color photograph (<100KB JPG), Aadhaar Card, and local residence proof ready.",
        tips: "Ensure no pending criminal litigation exists."
      },
      {
        step: 2,
        title: "Access WBPMS Portal & Select Character Certificate",
        bengaliTitle: "পোর্টালে গিয়ে চারিত্রিক সনদপত্র নির্বাচন",
        description: "Log in to wbpms.in/citizen/ with mobile OTP. Select 'Character Certificate' under Bagula II Gram Panchayat.",
        tips: "State clearly the purpose: Employment, College Admission, or Defense Recruitment."
      },
      {
        step: 3,
        title: "Upload Documents & Submit Application",
        bengaliTitle: "নথি আপলোড ও আবেদন দাখিল",
        description: "Upload photograph (<100KB JPG), Aadhaar (<2MB PDF), and residential proof. Submit the application form.",
        tips: "Note down the Application ID displayed on screen."
      },
      {
        step: 4,
        title: "Verification by Local Panchayat Member & GP Office",
        bengaliTitle: "পঞ্চায়েত সদস্য ও অফিস যাচাই",
        description: "GP staff and local ward representative confirm applicant's clean record and peaceful conduct in the area.",
        tips: "Usually processed within 5 working days."
      },
      {
        step: 5,
        title: "Download Digitally Signed Character Certificate",
        bengaliTitle: "ডিজিটাল চারিত্রিক সনদপত্র ডাউনলোড",
        description: "Download the QR-enabled certificate bearing the official seal and Pradhan's digital signature.",
        tips: "Accepted by recruitment boards and police verification officers."
      }
    ],
    documents: [
      { name: "Applicant Passport Size Photograph", bengaliName: "পাসপোর্ট ছবি", mandatory: true, format: "JPG", maxSize: "100 KB" },
      { name: "Aadhaar Card / Voter ID (EPIC)", bengaliName: "আধার বা ভোটার কার্ড", mandatory: true, format: "PDF", maxSize: "2 MB" },
      { name: "Proof of Residence (Tax Receipt / Parikrama)", bengaliName: "ট্যাক্স রশিদ / পরচা", mandatory: true, format: "PDF", maxSize: "2 MB" }
    ],
    videoGuide: {
      title: "How to Apply for Panchayat Character Certificate Online (WBPMS)",
      bengaliTitle: "অনলাইনে চারিত্রিক সনদপত্র আবেদন করার সম্পূর্ণ পদ্ধতি (ভিডিও গাইড)",
      channel: "Technical Rayn & WB GP Support",
      youtubeId: "n0v_M6eN7cQ",
      youtubeUrl: "https://www.youtube.com/results?search_query=how+to+apply+panchayat+character+certificate+online+west+bengal+wbpms",
      duration: "6 mins 30 secs",
      highlights: [
        "Applying for job/police verification character certificate",
        "Document specifications and verification timeline",
        "Downloading QR code enabled certificate online"
      ]
    },
    localOfficeNotice: "Keep your application acknowledgment number ready if visiting the Bagula II GP office."
  },

  "wbpms-same-person": {
    id: "wbpms-same-person",
    title: "Same Person Certificate (WBPMS)",
    bengaliTitle: "একই ব্যক্তি শংসাপত্র (WBPMS পোর্টাল)",
    category: "Panchayat e-Certificates",
    portalName: "WBPMS Citizen Portal (Dept. of Panchayat & Rural Development, Govt. of WB)",
    portalUrl: "https://wbpms.in/citizen/",
    officialDept: "Panchayat & Rural Development Department, Government of West Bengal",
    description: "Official certificate issued by Bagula II Gram Panchayat verifying that two or more name variations, aliases, or spelling discrepancies in different documents belong to the exact same citizen.",
    bengaliDescription: "ভোটার কার্ড, আধার কার্ড, জমির দলিল বা শিক্ষাগত সনদে নামের বানানে পার্থক্য থাকলে পঞ্চায়েত প্রধান কর্তৃক 'উভয় নাম একই ব্যক্তির' মর্মে প্রদত্ত অফিসিয়াল প্রত্যয়নপত্র।",
    regulatoryInfo: "West Bengal Panchayat Act, 1973 & Public Grievance Verification Norms.",
    turnaroundTime: "Within 7 working days",
    validity: "Permanent / Valid for submission as supporting affidavit",
    feeInfo: "Free of cost (বিনামূল্যে) under West Bengal rural e-governance.",
    workflow: [
      {
        step: 1,
        title: "Collect Proofs with Differing Name Spellings",
        bengaliTitle: "বিভিন্ন নামের প্রমাণপত্র সংগ্রহ",
        description: "Assemble both documents showing the discrepancy (e.g., Aadhaar with 'Firstname Lastname' and Voter Card with 'Firstname Middle Lastname').",
        tips: "Ensure both documents establish identical parentage and address in Bagula II GP."
      },
      {
        step: 2,
        title: "Obtain Gram Sansad Member Certificate",
        bengaliTitle: "গ্রাম সংসদ সদস্যের প্রত্যয়নপত্র",
        description: "Request local Gram Sansad member to attest that the person known by both names is a resident of Bagula II GP.",
        tips: "The Sansad member must explicitly write both names and father/husband name."
      },
      {
        step: 3,
        title: "Access WBPMS Citizen Portal & Submit Form",
        bengaliTitle: "WBPMS পোর্টালে লগইন ও আবেদন দাখিল",
        description: "Log in via mobile OTP on wbpms.in, select Nadia -> Hanskhali -> Bagula II, choose 'Same Person Certificate', enter both name variations and upload JPG photo (<100KB) and supporting PDFs (<2MB).",
        tips: "State both names clearly in the applicant alias fields."
      },
      {
        step: 4,
        title: "GP Scrutiny & Download QR Certificate",
        bengaliTitle: "যাচাইকরণ ও ডিজিটাল শংসাপত্র ডাউনলোড",
        description: "The Sub-Registrar / Pradhan reviews the record. Upon digital signing, download the official QR-enabled certificate directly.",
        tips: "Valid across banks, courts, land registry, and government departments."
      }
    ],
    documents: [
      { name: "Recent Passport Size Photograph", bengaliName: "পাসপোর্ট ছবি", mandatory: true, format: "JPG", maxSize: "100 KB" },
      { name: "Document 1 showing First Name Spelling (Aadhaar / Voter)", bengaliName: "প্রথম নামের প্রমাণপত্র", mandatory: true, format: "PDF", maxSize: "2 MB" },
      { name: "Document 2 showing Second Name Spelling / Alias", bengaliName: "দ্বিতীয় নামের প্রমাণপত্র", mandatory: true, format: "PDF", maxSize: "2 MB" },
      { name: "Gram Sansad Member Attestation Certificate", bengaliName: "গ্রাম সংসদ সদস্যের প্রত্যয়নপত্র", mandatory: true, format: "PDF", maxSize: "2 MB" }
    ],
    videoGuide: {
      title: "How to Apply for Same Person Certificate in West Bengal Online (WBPMS)",
      bengaliTitle: "অনলাইনে একই ব্যক্তি শংসাপত্র আবেদন করার পদ্ধতি (ভিডিও গাইড)",
      channel: "Bangla Tech & Panchayat Services",
      youtubeId: "V5iM_spWbpms",
      youtubeUrl: "https://www.youtube.com/results?search_query=how+to+apply+same+person+certificate+panchayat+west+bengal+wbpms",
      duration: "7 mins 15 secs",
      highlights: [
        "Resolving name spelling mismatches in government records",
        "Uploading two identity proofs showing differing names",
        "Verification by Bagula II Gram Panchayat"
      ]
    },
    localOfficeNotice: "Keep your application acknowledgment number ready if visiting the Bagula II GP office."
  },

  "wbpms-distance": {
    id: "wbpms-distance",
    title: "Distance Certificate (WBPMS)",
    bengaliTitle: "দূরত্বের শংসাপত্র (WBPMS পোর্টাল)",
    category: "Panchayat e-Certificates",
    portalName: "WBPMS Citizen Portal (Dept. of Panchayat & Rural Development, Govt. of WB)",
    portalUrl: "https://wbpms.in/citizen/",
    officialDept: "Panchayat & Rural Development Department, Government of West Bengal",
    description: "Official certificate certifying the distance in kilometers from the applicant's residence in Bagula II Gram Panchayat to an educational institution, workplace, hospital, or railway station.",
    bengaliDescription: "স্কুল, কলেজ, কর্মস্থল বা রেলওয়ে স্টেশনের সঙ্গে বাগুলা ২ নং গ্রাম পঞ্চায়েতের বাসস্থানের দূরত্বের সরকারি প্রত্যয়নপত্র (শিক্ষার্থীদের ছাড় বা ভাতার জন্য)।",
    regulatoryInfo: "West Bengal Panchayat Act, 1973 & Citizen Charter.",
    turnaroundTime: "Within 7 working days",
    validity: "6 months from date of issue",
    feeInfo: "Free of cost (বিনামূল্যে) under West Bengal rural e-governance.",
    workflow: [
      {
        step: 1,
        title: "Identify Destination & Local Landmark",
        bengaliTitle: "গন্তব্য ও অবস্থানের বিবরণ প্রস্তুত",
        description: "Note down the exact name and address of the institution/destination (e.g., Bagula Higher Secondary School, Bagula Railway Station, College).",
        tips: "Check whether your school or employer has specified a format."
      },
      {
        step: 2,
        title: "Obtain Gram Sansad Member Distance Report",
        bengaliTitle: "সংসদ সদস্যের দূরত্বের প্রত্যয়নপত্র",
        description: "Local Gram Sansad member verifies the village/para of residence and estimates road distance in kilometers.",
        tips: "Ensure village, para, and landmark are clearly mentioned."
      },
      {
        step: 3,
        title: "Fill WBPMS Online Application",
        bengaliTitle: "অনলাইনে দূরত্ব সার্টিফিকেটের ফর্ম পূরণ",
        description: "Log in on wbpms.in, select Bagula II GP, enter residential address and destination landmark, then upload photograph and PDFs.",
        tips: "Upload JPG photo (<100KB) and residence proof PDF (<2MB)."
      },
      {
        step: 4,
        title: "Digital Certificate Issuance",
        bengaliTitle: "ডিজিটাল সার্টিফিকেট ডাউনলোড",
        description: "GP Nirman Sahayak / Pradhan approves the distance calculation. Download the QR-enabled certificate.",
        tips: "Accepted by transport authorities, schools, and employer HR departments."
      }
    ],
    documents: [
      { name: "Recent Passport Size Photograph", bengaliName: "পাসপোর্ট ছবি", mandatory: true, format: "JPG", maxSize: "100 KB" },
      { name: "Proof of Residence (Aadhaar / Tax Receipt / Ration Card)", bengaliName: "বাসস্থানের প্রমাণপত্র", mandatory: true, format: "PDF", maxSize: "2 MB" },
      { name: "Gram Sansad Member Recommendation / Verification", bengaliName: "গ্রাম সংসদ সদস্যের সুপারিশপত্র", mandatory: true, format: "PDF", maxSize: "2 MB" }
    ],
    videoGuide: {
      title: "Panchayat Distance Certificate Online Application Procedure (WBPMS)",
      bengaliTitle: "অনলাইনে দূরত্বের সার্টিফিকেট আবেদন নির্দেশিকা (ভিডিও)",
      channel: "WB Panchayat Guidance",
      youtubeId: "D1st_Wbpms",
      youtubeUrl: "https://www.youtube.com/results?search_query=panchayat+distance+certificate+online+apply+west+bengal+wbpms",
      duration: "5 mins 40 secs",
      highlights: [
        "Specifying route and approximate distance in kilometers",
        "Document attachments and photo requirements",
        "Downloading digitally signed QR certificate"
      ]
    },
    localOfficeNotice: "Keep your application acknowledgment number ready if visiting the Bagula II GP office."
  },

  "wbpms-caste": {
    id: "wbpms-caste",
    title: "Caste Authentication Certificate (WBPMS)",
    bengaliTitle: "জাতিগত প্রমাণীকরণ শংসাপত্র (WBPMS পোর্টাল)",
    category: "Panchayat e-Certificates",
    portalName: "WBPMS Citizen Portal (Dept. of Panchayat & Rural Development, Govt. of WB)",
    portalUrl: "https://wbpms.in/citizen/",
    officialDept: "Panchayat & Rural Development Department, Government of West Bengal",
    description: "Preliminary local verification and caste authentication certificate issued by Bagula II Gram Panchayat required prior to official SDO/BDO SC/ST/OBC certificate processing.",
    bengaliDescription: "এসডিও/বিডিও অফিস থেকে এসসি/এসটি/ওবিসি সার্টিফিকেট পাওয়ার আগে বাগুলা ২ নং গ্রাম পঞ্চায়েত থেকে স্থানীয় জাতিগত পরিচিতি যাচাইকরণের প্রত্যয়নপত্র।",
    regulatoryInfo: "West Bengal SC & ST (Identification) Act, 1994 & P&RD Guidelines.",
    turnaroundTime: "Within 7 working days",
    validity: "6 months for administrative processing",
    feeInfo: "Free of cost (বিনামূল্যে) under West Bengal rural e-governance.",
    workflow: [
      {
        step: 1,
        title: "Assemble Paternal Lineage & Caste Documents",
        bengaliTitle: "রক্তের সম্পর্কের আত্মীয়ের কাস্ট সার্টিফিকেট সংগ্রহ",
        description: "Gather blood relation certificate (father, grandfather, uncle, or real brother's SC/ST/OBC certificate issued by competent authority).",
        tips: "CRITICAL: Merging rule applies — all family caste proofs must be combined into ONE PDF file."
      },
      {
        step: 2,
        title: "Obtain Gram Sansad Member Caste Verification",
        bengaliTitle: "গ্রাম সংসদ সদস্যের বংশতালিকা ও জাতি যাচাই",
        description: "Concerned Gram Sansad member verifies family pedigree (Vamshabriksha) and confirms sub-caste community within Bagula II GP.",
        tips: "Ensure the Vamshabriksha clearly shows genealogical relationship."
      },
      {
        step: 3,
        title: "Upload Merged Single PDF & Submit on WBPMS",
        bengaliTitle: "একক ফাইলে মার্জ করে পিডিএফ আপলোড",
        description: "Log in to wbpms.in, select Bagula II GP -> Caste Authentication. Upload applicant JPG photo (<100KB) and the single merged family caste proof PDF (<2MB).",
        tips: "System will reject multi-file uploads; all caste proofs MUST be inside one PDF file."
      },
      {
        step: 4,
        title: "Gram Panchayat Verification & Certificate Issuance",
        bengaliTitle: "গ্রাম পঞ্চায়েত অনুমোদন ও সার্টিফিকেট সংগ্রহ",
        description: "The Sub-Registrar / Pradhan authenticates local resident lineage against electoral rolls and issues the digital QR certificate.",
        tips: "Attach this GP certificate directly to your online Oasis / Caste Certificate portal application."
      }
    ],
    documents: [
      { name: "Recent Passport Size Photograph", bengaliName: "পাসপোর্ট ছবি", mandatory: true, format: "JPG", maxSize: "100 KB" },
      { name: "Family Members' Caste Proofs (MERGED SINGLE PDF)", bengaliName: "পরিবারের কাস্ট সার্টিফিকেট (একত্রিত একক PDF)", mandatory: true, format: "PDF", maxSize: "2 MB" },
      { name: "Applicant Identity & Age Proof (Aadhaar / School Admit)", bengaliName: "আবেদনকারীর আধার বা অ্যাডমিট কার্ড", mandatory: true, format: "PDF", maxSize: "2 MB" },
      { name: "Gram Sansad Member Vamshabriksha / Certificate", bengaliName: "গ্রাম সংসদ সদস্যের বংশতালিকা প্রত্যয়ন", mandatory: true, format: "PDF", maxSize: "2 MB" }
    ],
    videoGuide: {
      title: "How to Apply for Panchayat Caste Authentication Certificate Online (WBPMS)",
      bengaliTitle: "অনলাইনে জাতিগত প্রমাণীকরণ সার্টিফিকেট আবেদন পদ্ধতি (ভিডিও)",
      channel: "WB Sarkar Online Support",
      youtubeId: "C4st3_Wbpms",
      youtubeUrl: "https://www.youtube.com/results?search_query=how+to+apply+caste+authentication+certificate+panchayat+west+bengal+wbpms",
      duration: "8 mins 10 secs",
      highlights: [
        "MANDATORY: Merging family caste documents into a single PDF",
        "Gram Sansad member genealogical verification requirements",
        "Step-by-step submission on wbpms.in"
      ]
    },
    localOfficeNotice: "Documents related to proof of caste from immediate or extended family members MUST be merged into a single PDF file (Mandatory for Caste Authentication only)."
  },

  "wbpms-unmarried": {
    id: "wbpms-unmarried",
    title: "Unmarried Certificate (WBPMS)",
    bengaliTitle: "অবিবাহিত শংসাপত্র (WBPMS পোর্টাল)",
    category: "Panchayat e-Certificates",
    portalName: "WBPMS Citizen Portal (Dept. of Panchayat & Rural Development, Govt. of WB)",
    portalUrl: "https://wbpms.in/citizen/",
    officialDept: "Panchayat & Rural Development Department, Government of West Bengal",
    description: "Official attestation of unmarried/single marital status issued by Bagula II Gram Panchayat Pradhan for defense rally recruitment, paramilitary forces, government schemes, or foreign visa clearance.",
    bengaliDescription: "সেনাবাহিনী র‍্যালি, পুলিশ নিয়োগ, সরকারি স্কলারশিপ বা বিবাহ নিবন্ধনের জন্য বাগুলা ২ নং পঞ্চায়েত প্রধানের অবিবাহিত প্রত্যয়নপত্র।",
    regulatoryInfo: "West Bengal Panchayat Act, 1973 & Special Marriage Guidelines.",
    turnaroundTime: "Within 7 working days",
    validity: "6 months from date of issue",
    feeInfo: "Free of cost (বিনামূল্যে) under West Bengal rural e-governance.",
    workflow: [
      {
        step: 1,
        title: "Collect Proof of Age and Residence",
        bengaliTitle: "বয়স ও বাসস্থানের প্রমাণপত্র সংগ্রহ",
        description: "Keep Class-X Admit Card or Birth Certificate (for age verification) and Aadhaar Card ready.",
        tips: "Applicant must meet the statutory age requirement (18+ for female, 21+ for male if requested for marriage clearance)."
      },
      {
        step: 2,
        title: "Obtain Gram Sansad Member Unmarried Declaration",
        bengaliTitle: "গ্রাম সংসদ সদস্যের অবিবাহিত প্রত্যয়ন",
        description: "Gram Sansad member confirms that the applicant has never been legally married and resides in Bagula II GP.",
        tips: "Parent/guardian signature is recommended on the local declaration."
      },
      {
        step: 3,
        title: "Submit Form on WBPMS Portal",
        bengaliTitle: "WBPMS পোর্টালে তথ্য পূরণ ও আবেদন দাখিল",
        description: "Log in via mobile OTP on wbpms.in, select Bagula II Gram Panchayat, choose 'Unmarried Certificate', upload JPG photo (<100KB) and supporting PDFs (<2MB).",
        tips: "Mention purpose (e.g., Army Agniveer Rally, Police Recruitment, Education)."
      },
      {
        step: 4,
        title: "Download QR Verified Certificate",
        bengaliTitle: "ডিজিটাল অবিবাহিত সনদপত্র ডাউনলোড",
        description: "Upon Pradhan verification, download the digitally signed certificate with official seal and QR code verification.",
        tips: "Directly acceptable at Army rally physical document screening."
      }
    ],
    documents: [
      { name: "Recent Passport Size Photograph", bengaliName: "পাসপোর্ট ছবি", mandatory: true, format: "JPG", maxSize: "100 KB" },
      { name: "Proof of Age (Admit Card / Birth Certificate / Aadhaar)", bengaliName: "বয়সের প্রমাণপত্র", mandatory: true, format: "PDF", maxSize: "2 MB" },
      { name: "Proof of Residence (Voter ID / Ration Card / GP Tax Receipt)", bengaliName: "বাসস্থানের প্রমাণ", mandatory: true, format: "PDF", maxSize: "2 MB" },
      { name: "Gram Sansad Member Certificate of Unmarried Status", bengaliName: "গ্রাম সংসদ সদস্যের অবিবাহিত প্রত্যয়ন", mandatory: true, format: "PDF", maxSize: "2 MB" }
    ],
    videoGuide: {
      title: "How to Apply for Panchayat Unmarried Certificate Online (WBPMS)",
      bengaliTitle: "অনলাইনে অবিবাহিত সার্টিফিকেট আবেদন পদ্ধতি (ভিডিও)",
      channel: "Sarkar Scheme & Employment",
      youtubeId: "Unm4r_Wbpms",
      youtubeUrl: "https://www.youtube.com/results?search_query=how+to+apply+unmarried+certificate+panchayat+west+bengal+wbpms",
      duration: "6 mins 10 secs",
      highlights: [
        "Requirements for Army / Police rally recruitment",
        "Age proof and Gram Sansad member attestation",
        "Downloading QR-enabled certificate on WBPMS"
      ]
    },
    localOfficeNotice: "Keep your application acknowledgment number ready if visiting the Bagula II GP office."
  },

  "wbpms-general": {
    id: "wbpms-general",
    title: "WBPMS Parichay Citizen Services Portal",
    bengaliTitle: "WBPMS পরিচয় সিটিজেন সার্ভিস পোর্টাল",
    category: "Panchayat e-Certificates",
    portalName: "WBPMS Citizen Portal (Dept. of Panchayat & Rural Development, Govt. of WB)",
    portalUrl: "https://wbpms.in/citizen/",
    officialDept: "Panchayat & Rural Development Department, Government of West Bengal",
    description: "Centralized West Bengal Gram Panchayat citizen services portal for applying, tracking, and downloading Residential, Character, Income, Same Person, Distance, Caste Authentication, and Unmarried certificates.",
    bengaliDescription: "পশ্চিমবঙ্গ সরকারের পঞ্চায়েত ও গ্রামোন্নয়ন দপ্তরের সেন্ট্রালাইজড সিটিজেন পোর্টাল। এর মাধ্যমে বাগদা ২ নং গ্রাম পঞ্চায়েতের সমস্ত ই-সার্টিফিকেট আবেদন ও ডাউনলোড করা যায়।",
    regulatoryInfo: "West Bengal Panchayat Act, 1973 & WBPMS Citizen Charter.",
    turnaroundTime: "Within 7 working days per service",
    validity: "6 months for certificates",
    feeInfo: "Nominal statutory portal fees.",
    workflow: [
      {
        step: 1,
        title: "Citizen Registration with Active Mobile Number",
        bengaliTitle: "মোবাইল নম্বর দিয়ে সিটিজেন রেজিস্ট্রেশন",
        description: "Register on wbpms.in/citizen/ using your mobile number and verify with OTP. Fill basic applicant profile.",
        tips: "One profile can be used for multiple family certificate applications."
      },
      {
        step: 2,
        title: "Select Nadia -> Hanskhali -> Bagula II Gram Panchayat",
        bengaliTitle: "জেলা, ব্লক ও গ্রাম পঞ্চায়েত নির্বাচন",
        description: "Choose your home jurisdiction correctly so the application routes to Bagula II Gram Panchayat.",
        tips: "Ensure you do not mistakenly choose adjacent Gram Panchayats."
      },
      {
        step: 3,
        title: "Select Desired Certificate & Complete Form",
        bengaliTitle: "কাঙ্ক্ষিত সার্ভিস নির্বাচন ও ফর্ম পূরণ",
        description: "Choose from Residential, Income, Character, Same Person, Distance, Caste Authentication, or Unmarried Certificate. Fill details and attach proofs.",
        tips: "Photo must be JPG <100KB; documents must be PDF <2MB."
      },
      {
        step: 4,
        title: "Track Application Status Online",
        bengaliTitle: "অনলাইনে আবেদনের স্থিতি পর্যবেক্ষণ",
        description: "Monitor the workflow through 'Submitted' -> 'Under Verification' -> 'Approved by Pradhan'.",
        tips: "SMS alerts are dispatched at each stage."
      },
      {
        step: 5,
        title: "Download Digitally Signed QR Certificate",
        bengaliTitle: "ডিজিটাল কিউআর সার্টিফিকেট ডাউনলোড",
        description: "Download the completed certificate containing verification QR code directly to your smartphone or PC.",
        tips: "No manual counter signature or rubber stamp is required."
      }
    ],
    documents: [
      { name: "Recent Passport Size Photograph", bengaliName: "পাসপোর্ট ছবি", mandatory: true, format: "JPG", maxSize: "100 KB" },
      { name: "Two Identity and Address Proofs (Aadhaar, EPIC, Ration Card)", bengaliName: "দুটি পরিচয় ও ঠিকানার নথি", mandatory: true, format: "PDF", maxSize: "2 MB each" },
      { name: "GP Household Tax Clearance Receipt", bengaliName: "পঞ্চায়েত ট্যাক্স রশিদ", mandatory: true, format: "PDF", maxSize: "2 MB" }
    ],
    videoGuide: {
      title: "Complete Guide to WBPMS Citizen Portal Services in West Bengal",
      bengaliTitle: "WBPMS পোর্টালে সব ধরণের সার্টিফিকেট আবেদনের সম্পূর্ণ নিয়ম (ভিডিও গাইড)",
      channel: "Digital Seva Bangla & State e-Governance",
      youtubeId: "n0v_M6eN7cQ",
      youtubeUrl: "https://www.youtube.com/results?search_query=wbpms+citizen+portal+online+apply+west+bengal",
      duration: "10 mins 15 secs",
      highlights: [
        "How to create citizen account and register mobile number",
        "Applying for 7 distinct Gram Panchayat certificates",
        "Document compression and error troubleshooting",
        "How to verify the digital QR code on issued certificates"
      ]
    },
    localOfficeNotice: "Bagula II Gram Panchayat officers process incoming applications daily during office hours (10:30 AM to 5:00 PM)."
  },

  "prd-tax": {
    id: "prd-tax",
    title: "Gram Panchayat Property & Land Tax Online Payment",
    bengaliTitle: "গ্রাম পঞ্চায়েত গৃহকর ও সম্পত্তি কর অনলাইন প্রদান",
    category: "Tax & Revenue",
    portalName: "PRD Tax Portal (Dept. of Panchayat & Rural Development, Govt. of WB)",
    portalUrl: "https://prdtax.wb.gov.in",
    officialDept: "Panchayat & Rural Development Department, Government of West Bengal",
    description: "Official portal for online assessment, inquiry, and payment of Gram Panchayat household, land, and commercial property tax for Bagula II Gram Panchayat with instant money receipt generation.",
    bengaliDescription: "ঘরে বসে মোবাইল বা কম্পিউটারের মাধ্যমে বাগদা ২ নং গ্রাম পঞ্চায়েতের গৃহকর ও সম্পত্তি কর পরিশোধ এবং ডিজিটাল সরকারি পেমেন্ট রশিদ ডাউনলোডের অনলাইন পোর্টাল।",
    regulatoryInfo: "West Bengal Panchayat Act, 1973 & West Bengal Panchayat (Tax) Rules.",
    turnaroundTime: "Instant receipt generation upon payment",
    validity: "Financial Year Official Tax Clearance",
    feeInfo: "Property tax as per Bagula II GP assessment schedule + nominal payment gateway charge.",
    workflow: [
      {
        step: 1,
        title: "Locate Your Assessee Number / Old Tax Receipt",
        bengaliTitle: "অ্যাসেসি নম্বর বা পুরোনো ট্যাক্স রশিদ বের করুন",
        description: "Find your 10 to 12 digit Assessee Number from your previous physical tax receipt issued by Bagula II Gram Panchayat.",
        tips: "If you do not have an Assessee Number, use the 'Search by Name / Ward' option on the portal."
      },
      {
        step: 2,
        title: "Access PRD Tax Portal & Select GP",
        bengaliTitle: "PRD ট্যাক্স পোর্টালে গিয়ে পঞ্চায়েত নির্বাচন",
        description: "Visit prdtax.wb.gov.in. Choose District: Nadia -> Block: Hanskhali -> Gram Panchayat: Bagula II. Select your Ward or Village.",
        tips: "You can pay using PC or mobile smartphone."
      },
      {
        step: 3,
        title: "Search Tax Assessment & View Pending Dues",
        bengaliTitle: "বকেয়া ট্যাক্স ও মূল্যায়নের হিসাব দেখুন",
        description: "Enter Assessee Number or Holding Number. The portal displays current year tax, arrears (if any), and total payable amount.",
        tips: "Review owner name and property description before proceeding to pay."
      },
      {
        step: 4,
        title: "Pay via UPI, Debit Card, Net Banking, or QR",
        bengaliTitle: "ইউপিআই, ডেবিট কার্ড বা নেট ব্যাংকিং দিয়ে পেমেন্ট",
        description: "Select payment method (PhonePe, Google Pay, Paytm, BHIM UPI, RuPay Card, or Net Banking) through the official GRIPS / State Bank gateway.",
        tips: "Do not refresh or press back button during transaction processing."
      },
      {
        step: 5,
        title: "Instant Official Tax Receipt Download",
        bengaliTitle: "ডিজিটাল সরকারি ট্যাক্স রশিদ ডাউনলোড",
        description: "Immediately upon successful transaction, download the official Barcoded / QR-coded Tax Receipt.",
        tips: "This digital receipt is mandatory for Warish, WBPMS, mutation, and building plan clearance."
      }
    ],
    documents: [
      { name: "Old Gram Panchayat Tax Receipt / Assessee Number", bengaliName: "পুরোনো ট্যাক্স রশিদ / অ্যাসেসি নম্বর", mandatory: true, format: "Reference", maxSize: "N/A" },
      { name: "Registered Land Deed (Deed / Khatian / Porcha)", bengaliName: "দলিল বা খতিয়ান নম্বর", mandatory: false, format: "Reference", maxSize: "N/A", details: "For new assessee creation" }
    ],
    videoGuide: {
      title: "How To Pay Online Gram Panchayat Tax in West Bengal (Step-By-Step Guide)",
      bengaliTitle: "অনলাইনে গ্রাম পঞ্চায়েত ট্যাক্স পেমেন্ট করার নিয়ম (ভিডিও গাইড)",
      channel: "Digital Seva Bangla & PRD Helpdesk",
      youtubeId: "Z7l2qX3r_8M",
      youtubeUrl: "https://www.youtube.com/results?search_query=how+to+pay+gram+panchayat+tax+online+west+bengal+prdtax",
      duration: "6 mins 55 secs",
      highlights: [
        "Finding your Assessee number and holding details online",
        "Searching Bagula II Gram Panchayat property records",
        "Paying via UPI / QR code and instant receipt generation",
        "How to reprint old payment receipts from PRD portal"
      ]
    },
    localOfficeNotice: "Your online tax payment updates the Bagula II Gram Panchayat demand register immediately."
  },

  "mnrega-jobcard": {
    id: "mnrega-jobcard",
    title: "MGNREGA / 100 Days Work Job Card & Muster Roll",
    bengaliTitle: "১০০ দিনের কাজ (মহাত্মা গান্ধী জাতীয় গ্রামীণ কর্মসংস্থান) জব কার্ড তালিকা",
    category: "Rural Employment",
    portalName: "NREGA NIC Portal (Ministry of Rural Development, Govt. of India / PRD WB)",
    portalUrl: "https://mnregaweb2.dord.gov.in/Netnrega/writereaddata/citizen_out/panchregpeople_3201003002_eng2627.html",
    officialDept: "Ministry of Rural Development & Panchayat Dept., Govt. of West Bengal",
    description: "Official public database of registered workers, job card numbers, household members, and muster roll wage payment status for Bagula II Gram Panchayat (Code: 3201003002).",
    bengaliDescription: "বাগদা ২ নং গ্রাম পঞ্চায়েতের নিবন্ধিত শ্রমিক, ১০০ দিনের কাজের জব কার্ড নম্বর, পরিবারভুক্ত সদস্য ও কাজের হিসেব দেখার কেন্দ্রীয় সরকারি ডাটাবেস।",
    regulatoryInfo: "Mahatma Gandhi National Rural Employment Guarantee Act, 2005.",
    turnaroundTime: "Real-time public portal inquiry",
    validity: "Permanent Job Card Record",
    feeInfo: "100% Free public service.",
    workflow: [
      {
        step: 1,
        title: "Access the Official NIC NREGA Directory",
        bengaliTitle: "অফিসিয়াল NREGA পোর্টালে প্রবেশ",
        description: "Click proceed to view the official Gram Panchayat worker register pre-filtered for Bagula II (Panchayat Code: 3201003002).",
        tips: "The portal displays all registered worker families across all villages in Bagula II."
      },
      {
        step: 2,
        title: "Locate Your Name or Head of Household",
        bengaliTitle: "নাম বা পরিবারের প্রধানের নাম দিয়ে খুঁজুন",
        description: "Use browser search (Ctrl+F on PC, 'Find in Page' on phone) to search your Bengali or English name / Job Card suffix.",
        tips: "Sort by village / colony to locate family records faster."
      },
      {
        step: 3,
        title: "Click on Job Card Number to View Full History",
        bengaliTitle: "জব কার্ড নম্বরে ক্লিক করে কাজের হিসেব দেখুন",
        description: "Clicking on your unique Job Card link opens the complete ledger: days worked, muster roll numbers, wage credit dates, and bank account linkages.",
        tips: "Verify that your Aadhaar is mapped to your active bank account for DBT."
      },
      {
        step: 4,
        title: "Contact GP Gram Rojgar Sahayak (GRS) for Inquiries",
        bengaliTitle: "প্রয়োজনে গ্রাম রোজগার সহায়কের সাথে যোগাযোগ",
        description: "For new job card registration or inclusion of adult family members, contact the Gram Rojgar Sahayak (GRS) at Bagula II GP office.",
        tips: "Carry your family Aadhaar cards, bank passbook, and voter cards."
      }
    ],
    documents: [
      { name: "Aadhaar Card of all Adult Family Members", bengaliName: "সকল প্রাপ্তবয়স্ক সদস্যের আধার কার্ড", mandatory: true, format: "Reference", maxSize: "N/A" },
      { name: "Active Bank Account Passbook (Single or Joint with spouse)", bengaliName: "ব্যাংক পাসবই", mandatory: true, format: "Reference", maxSize: "N/A" },
      { name: "Voter ID Card (EPIC)", bengaliName: "ভোটার কার্ড", mandatory: true, format: "Reference", maxSize: "N/A" }
    ],
    videoGuide: {
      title: "How to Check West Bengal MGNREGA Job Card List Online",
      bengaliTitle: "অনলাইনে ১০০ দিনের কাজের জব কার্ড তালিকা দেখার নিয়ম (ভিডিও গাইড)",
      channel: "Digital Seva Bangla & Gramin Tech",
      youtubeId: "b8kM4f9r_X0",
      youtubeUrl: "https://www.youtube.com/results?search_query=how+to+check+mgnrega+job+card+list+online+west+bengal",
      duration: "5 mins 40 secs",
      highlights: [
        "Accessing state and district-wise Gram Panchayat lists",
        "Finding your family job card number and enrolled members",
        "Checking wage payment and muster roll attendance records"
      ]
    },
    localOfficeNotice: "Bagula II Gram Panchayat employment register is maintained by the Gram Rojgar Sahayak (GRS). Office hours: 10:30 AM to 5:00 PM."
  },
  "warish-workflow": {
    id: "warish-workflow",
    title: "Warish (Succession / Legal Heir) Certificate",
    bengaliTitle: "ওয়ারিশান / উত্তরাধিকার শংসাপত্র সংগ্রহ পদ্ধতি",
    category: "Panchayat Civil Certificate",
    portalName: "Bagula II Gram Panchayat Public Citizen Portal",
    portalUrl: "/public/apply/warish",
    officialDept: "Office of the Bagula II Gram Panchayat, Hanskhali, Nadia",
    description: "Official civil certification of surviving legal heirs of a deceased resident of Bagula II Gram Panchayat under Hindu Succession Act, 1956 & Indian Succession Act, 1925 for land mutation at BL&LRO, bank account settlement, pension, and property inheritance.",
    bengaliDescription: "বগুলা ২ নং গ্রাম পঞ্চায়েতের স্থায়ী মৃত নাগরিকের বৈধ ওয়ারিশান বা আইনগত উত্তরাধিকারীদের তালিকা প্রত্যয়নকারী সরকারি শংসাপত্র। জমি মিউটেশন, ব্যাংক হিসাব নিষ্পত্তি ও পারিবারিক সম্পত্তি হস্তান্তরের জন্য অপরিহার্য।",
    regulatoryInfo: "Section 19 of West Bengal Panchayat Act, 1973 read with Rule 28 of GP Administration Rules; Hindu Succession Act, 1956 (as amended 2005) & Indian Succession Act, 1925.",
    turnaroundTime: "7 to 15 working days (subject to Gram Sansad physical enquiry)",
    validity: "Permanent legal civil document (unless cancelled due to suppression of heirs)",
    feeInfo: "Nominal facilitation fee as per West Bengal Gram Panchayat Gazette Schedule.",
    downloadFormUrl: "#affidavit-sample",
    downloadFormLabel: "View Sample Court Affidavit & Vamshabriksha Format",
    workflow: [
      {
        step: 1,
        title: "Collect Death Certificate & Current Year GP Land Tax Receipt",
        bengaliTitle: "মৃত্যু শংসাপত্র ও পঞ্চায়েতের চলতি খাজনা রশিদ সংগ্রহ",
        description: "Procure the official digital QR-coded Death Certificate of the deceased from Janma-Mrityu Tathya (CRS) portal or hospital. Ensure current year property tax / Khajna is cleared with Bagula II Gram Panchayat.",
        tips: "The name and father/husband name on the death certificate must strictly match land deeds and heir records."
      },
      {
        step: 2,
        title: "Execute Court Affidavit & Draw Complete Family Tree (Vamshabriksha)",
        bengaliTitle: "নোটারি বা ম্যাজিস্ট্রেটের সম্মুখে বংশবৃক্ষ হলফনামা সম্পাদন",
        description: "Draft a comprehensive family tree (Vamshabriksha) listing all living Class-I legal heirs (sons, daughters, widow, mother). Swear an affidavit before a 1st Class Judicial Magistrate, Executive Magistrate, or Notary Public declaring that no heirs have been omitted.",
        tips: "Under the 2005 amendment to the Hindu Succession Act, married daughters have equal coparcenary rights and MUST be included in the heir list."
      },
      {
        step: 3,
        title: "Local Gram Sansad Member Physical Enquiry & Witness Attestation",
        bengaliTitle: "গ্রাম সংসদ সদস্য কর্তৃক সরেজমিনে তদন্ত ও সাক্ষ্য গ্রহণ",
        description: "Submit the drafted genealogy and affidavit copy to the elected Gram Sansad Member of the deceased's ward (Sansad 1 to 18 of Bagula II GP). The Sansad Member conducts a local village enquiry with two independent neighbors to verify that the heir list is genuine.",
        tips: "Two local witnesses with valid Voter IDs must sign the enquiry report."
      },
      {
        step: 4,
        title: "Submit Online via Citizen Portal or Office DEO Desk",
        bengaliTitle: "অনলাইনে বা পঞ্চায়েত ডিইও ডেস্কে আবেদনপত্র দাখিল",
        description: "Apply online through the Bagula II GP Public Citizen Portal (/public/apply/warish) by uploading scans of death proof, affidavit, and heir ID proofs. Alternatively, submit the physical file at the GP Data Entry Operator (DEO) desk.",
        tips: "Keep your digital Acknowledgement Number safely noted to track progress online."
      },
      {
        step: 5,
        title: "Office Scrutiny by Executive Assistant & Secretary",
        bengaliTitle: "পঞ্চায়েত সচিব ও এক্সিকিউটিভ অ্যাসিস্ট্যান্ট কর্তৃক যাচাই",
        description: "The GP office cross-verifies land records, checks for any registered title disputes or caveat notices, and validates the affidavit against the local Gram Sansad enquiry report. In contentious cases, a 7-day public notice is displayed on the GP notice board.",
        tips: "Respond promptly if the office requests any additional identity clarification."
      },
      {
        step: 6,
        title: "Final Approval by GP Prodhan & QR Digital Certificate Issuance",
        bengaliTitle: "প্রধানের চূড়ান্ত অনুমোদন ও ডিজিটাল কিউআর শংসাপত্র প্রদান",
        description: "Upon satisfactory verification, GP Prodhan Smt. Susmita Biswas Barman digitally approves the application. The official Warish Certificate is generated with a cryptographic verification ID and QR code, immediately verifiable at /verify.",
        tips: "The issued certificate is valid for submission to BL&LRO Hanskhali, banks, courts, and insurance offices."
      }
    ],
    documents: [
      { name: "Digital Death Certificate of Deceased", bengaliName: "মৃত ব্যক্তির ডিজিটাল মৃত্যু শংসাপত্র (CRS / হাসপাতাল)", mandatory: true, format: "PDF / JPG", maxSize: "2 MB", details: "Issued by Janma-Mrityu Tathya or competent hospital authority" },
      { name: "Sworn Court Affidavit with Vamshabriksha", bengaliName: "নোটারি বা ম্যাজিস্ট্রেটের সম্মুখে সম্পাদিত বংশবৃক্ষ হলফনামা", mandatory: true, format: "PDF / Original", maxSize: "2 MB", details: "Declaring all surviving legal heirs with relationship, age, and address" },
      { name: "Current Year Bagula II GP Tax / Khajna Receipt", bengaliName: "বাগদা ২ নং গ্রাম পঞ্চায়েতের হালসনের ট্যাক্স / খাজনা রশিদ", mandatory: true, format: "PDF / JPG", maxSize: "1 MB", details: "Proof of domicile and property tax clearance in Bagula II GP" },
      { name: "Aadhaar Card & Voter ID of ALL Legal Heirs", bengaliName: "সকল বৈধ ওয়ারিশানের আধার ও ভোটার কার্ড", mandatory: true, format: "PDF / JPG", maxSize: "2 MB", details: "Mandatory for every surviving heir listed in the genealogy" },
      { name: "Land Deed (দলিল) or RoR / Porcha (খতিয়ান)", bengaliName: "জমির মূল দলিল বা পরচা / আর.ও.আর খতিয়ান", mandatory: true, format: "PDF / Reference", maxSize: "2 MB", details: "Showing deceased's recorded property ownership in Hanskhali / Nadia" },
      { name: "Gram Sansad Member Enquiry Report & 2 Witness Signatures", bengaliName: "গ্রাম সংসদ সদস্যের সরজমিন তদন্ত রিপোর্ট ও ২ জন স্থানীয় সাক্ষীর স্বাক্ষর", mandatory: true, format: "Physical / PDF", maxSize: "2 MB", details: "Endorsement from elected ward representative of Bagula II GP" },
      { name: "Death Certificate of any Pre-deceased Legal Heir", bengaliName: "পূর্বে মৃত কোনো ওয়ারিশান থাকলে তাঁর মৃত্যু শংসাপত্র", mandatory: false, format: "PDF / JPG", maxSize: "1 MB", details: "Required if any son or daughter passed away leaving surviving grandchildren" }
    ],
    videoGuide: {
      title: "How to Apply for Warish (Succession) Certificate in West Bengal Gram Panchayat",
      bengaliTitle: "গ্রাম পঞ্চায়েত থেকে ওয়ারিশান বা উত্তরাধিকার শংসাপত্র পাওয়ার সম্পূর্ণ নিয়ম (ভিডিও গাইড)",
      channel: "Bangla Rural Tech & GP Seva",
      youtubeId: "vBsqBjhP5G4",
      youtubeUrl: "https://www.youtube.com/results?search_query=warish+certificate+gram+panchayat+west+bengal",
      duration: "7 mins 15 secs",
      highlights: [
        "Step-by-step documentation for land mutation and bank claim",
        "How to draft a legally sound Vamshabriksha (Genealogical Tree) affidavit",
        "Rules regarding equal shares for married daughters and widows",
        "Gram Sansad member enquiry and digital verification on the GP portal"
      ]
    },
    localOfficeNotice: "Bagula II Gram Panchayat office receives Warish Certificate applications on all working days from 10:30 AM to 4:30 PM. Inquiries and hearings are conducted under the supervision of the Executive Assistant and Pradhan."
  },
  "dependent-workflow": {
    id: "dependent-workflow",
    title: "Dependent Certificate (Family Dependency)",
    bengaliTitle: "নির্ভরশীলতা বা পোষ্য শংসাপত্র সংগ্রহ নির্দেশিকা",
    category: "Panchayat Civil Certificate",
    portalName: "Bagula II Gram Panchayat Public Citizen Portal",
    portalUrl: "/public/apply/dependent",
    officialDept: "Office of the Bagula II Gram Panchayat, Hanskhali, Nadia",
    description: "Official dependency certification issued by Bagula II Gram Panchayat for family members residing with and wholly dependent on a government, railway, defence, or private employee / pensioner for medical benefits (CGHS/WBHS), compassionate appointment, railway passes, and education fee relief.",
    bengaliDescription: "বগুলা ২ নং গ্রাম পঞ্চায়েতের স্থায়ী বাসিন্দা সরকারি, রেল, প্রতিরক্ষা বা অবসরপ্রাপ্ত কর্মচারীর ওপর সম্পূর্ণরূপে নির্ভরশীল পরিবারের সদস্যদের জন্য আনুষ্ঠানিক নির্ভরশীলতা শংসাপত্র। চিকিৎসা সুবিধা, পোষ্যদের চাকরি ও শিক্ষা বৃত্তির জন্য প্রয়োজনীয়।",
    regulatoryInfo: "West Bengal Panchayat Act, 1973 read with relevant Central / State Service Conduct & Medical Attendance Rules (CGHS/WBHS/Railway Medical Rules).",
    turnaroundTime: "3 to 7 working days following document scrutiny",
    validity: "1 year from the date of issue (or until change in financial dependency status)",
    feeInfo: "Nominal facilitation fee as per Gram Panchayat regulations.",
    downloadFormUrl: "#dependent-checklist",
    downloadFormLabel: "View Prescribed Dependency Declaration Format",
    workflow: [
      {
        step: 1,
        title: "Collect Employer / Department Prescribed Format",
        bengaliTitle: "চাকরিদাতা দপ্তর বা কর্তৃপক্ষের নির্ধারিত ফরম্যাট সংগ্রহ",
        description: "Many organisations (Eastern Railway, WB Health Scheme, Postal Dept, Armed Forces) provide a specific proforma for Dependent Certification. If your employer provides one, keep it ready for GP Prodhan counter-signature.",
        tips: "If no specific format is prescribed, the official Bagula II GP standard certificate format will be issued."
      },
      {
        step: 2,
        title: "Gather Employee Service & Dependent Non-Earning Proof",
        bengaliTitle: "কর্মচারীর পে-স্লিপ/পেনশন ও পোষ্যের উপার্জনহীনতার প্রমাণপত্র",
        description: "Obtain the principal earner's latest monthly salary pay slip, Pension Payment Order (PPO), or departmental ID card. For the dependent, prepare an affidavit or declaration confirming zero independent income.",
        tips: "If the dependent is a student over 18 years, attach a current institution bonafide / college enrollment certificate."
      },
      {
        step: 3,
        title: "Verify Joint Domicile & Ration Card in Bagula II GP",
        bengaliTitle: "একত্রে বসবাসের প্রমাণ ও পারিবারিক ডিজিটাল রেশন কার্ড",
        description: "Provide the family Digital Ration Card, Voter List extract, or Aadhaar cards demonstrating that the principal earner and the dependent reside under the same roof within Bagula II GP jurisdiction.",
        tips: "Both the principal earner and dependent addresses must reflect Bagula II GP villages (e.g., Stationpara, Collegepara, Bathanpara)."
      },
      {
        step: 4,
        title: "Gram Sansad Member Attestation & Enquiry",
        bengaliTitle: "গ্রাম সংসদ সদস্যের সরজমিন পরিদর্শন ও প্রত্যয়ন",
        description: "The elected Gram Sansad Member of the respective ward certifies that the dependent is genuinely maintained by the principal earner and does not possess any separate business or employment.",
        tips: "Carry parent/dependent Aadhaar cards during the member's inspection."
      },
      {
        step: 5,
        title: "Submit Online via Portal or GP Office Counter",
        bengaliTitle: "অনলাইনে বা পঞ্চায়েত অফিসে আবেদন ও অনুমোদন",
        description: "Submit your application online at /public/apply/dependent or visit the Bagula II GP office DEO counter. Upon verification by the GP Executive Assistant, Pradhan Smt. Susmita Biswas Barman signs and issues the certificate with digital verification code.",
        tips: "Verify the generated certificate anytime at /verify using the 8-character verification ID."
      }
    ],
    documents: [
      { name: "Principal Earner Pay Slip / PPO / Service ID Card", bengaliName: "কর্মচারীর বর্তমান পে-স্লিপ / পেনশন পেমেন্ট অর্ডার (PPO)", mandatory: true, format: "PDF / JPG", maxSize: "2 MB", details: "Proof of employment or pension status of the primary provider" },
      { name: "Joint Residence Proof (Ration Card / Voter List)", bengaliName: "একত্রে বসবাসের প্রমাণ (ডিজিটাল রেশন কার্ড / পরিবারের ভোটার তালিকা)", mandatory: true, format: "PDF / JPG", maxSize: "2 MB", details: "Must show common residence in Bagula II Gram Panchayat area" },
      { name: "Aadhaar & Age Proof of Dependent", bengaliName: "পোষ্যের আধার কার্ড ও বয়সের প্রমাণপত্র (জন্ম সনদ / অ্যাডমিট কার্ড)", mandatory: true, format: "PDF / JPG", maxSize: "2 MB", details: "Verifies relationship, age, and identity of the dependent person" },
      { name: "Non-Earning / Unemployment Declaration Affidavit", bengaliName: "পোষ্যের কোনো নিজস্ব উপার্জনের উৎস নেই মর্মে স্বঘোষণাপত্র বা হলফনামা", mandatory: true, format: "PDF / Original", maxSize: "1 MB", details: "Sworn statement that the dependent has no independent livelihood" },
      { name: "Student Bonafide Certificate (if adult student)", bengaliName: "শিক্ষা প্রতিষ্ঠানে পাঠরত থাকার প্রশংসাপত্র (প্রাপ্তবয়স্ক ছাত্রছাত্রীদের ক্ষেত্রে)", mandatory: false, format: "PDF / JPG", maxSize: "1 MB", details: "Mandatory if the dependent child is aged between 18 and 25 and studying" },
      { name: "Disability Certificate from CMOH (if applicable)", bengaliName: "প্রতিবন্ধী শংসাপত্র (অসুস্থ বা বিশেষ চাহিদাসম্পন্ন পোষ্যের ক্ষেত্রে)", mandatory: false, format: "PDF / JPG", maxSize: "2 MB", details: "Issued by Chief Medical Officer of Health or authorized medical board" },
      { name: "Gram Sansad Member Enquiry Certificate", bengaliName: "সংশ্লিষ্ট গ্রাম সংসদ সদস্যের তদন্ত ও প্রত্যয়ন রিপোর্ট", mandatory: true, format: "Physical / PDF", maxSize: "1 MB", details: "Ward member attestation certifying physical co-residence and dependency" }
    ],
    videoGuide: {
      title: "How to Get Dependent Certificate from Gram Panchayat in West Bengal",
      bengaliTitle: "গ্রাম পঞ্চায়েত থেকে পোষ্য বা নির্ভরশীলতা শংসাপত্র নেওয়ার সম্পূর্ণ নিয়ম (ভিডিও গাইড)",
      channel: "WB Public Seva Info",
      youtubeId: "9g2xU0G9Jb8",
      youtubeUrl: "https://www.youtube.com/results?search_query=dependent+certificate+gram+panchayat+west+bengal",
      duration: "6 mins 10 secs",
      highlights: [
        "Eligibility conditions for medical facilities and compassionate appointment",
        "Documents required from serving employee or pensioner",
        "How to prove non-earning status and shared domestic household",
        "GP Pradhan counter-signature on departmental proforma"
      ]
    },
    localOfficeNotice: "Dependent Certificate applications are scrutinized by the Bagula II Gram Panchayat administrative staff. In-person verification of original salary slip / PPO may be requested prior to final endorsement."
  }
};

export function getRedirectGuide(key: string): RedirectGuide {
  // Check if live dynamic Master Data override exists in local storage
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("bagula_sop_master_guides_cache_v1");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed[key]) {
          return parsed[key];
        }
      }
    } catch {
      // Fallback to static
    }
  }

  if (REDIRECT_GUIDES[key]) {
    return REDIRECT_GUIDES[key];
  }

  // Warish & Dependent specific mappings
  if (key.includes("warish") || key.includes("succession") || key.includes("legal-heir")) {
    return REDIRECT_GUIDES["warish-workflow"];
  }

  if (key.includes("dependent") || key.includes("poshyo") || key.includes("nirbhor")) {
    return REDIRECT_GUIDES["dependent-workflow"];
  }

  // WBPMS specific mappings
  if (key.startsWith("wbpms-")) {
    const sub = key.replace("wbpms-", "").toLowerCase();
    if (sub === "residential") return REDIRECT_GUIDES["wbpms-residential"];
    if (sub === "income") return REDIRECT_GUIDES["wbpms-income"];
    if (sub === "character") return REDIRECT_GUIDES["wbpms-character"];
    if (sub === "same-person" || sub === "sameperson") return REDIRECT_GUIDES["wbpms-same-person"];
    if (sub === "distance") return REDIRECT_GUIDES["wbpms-distance"];
    if (sub === "caste") return REDIRECT_GUIDES["wbpms-caste"];
    if (sub === "unmarried") return REDIRECT_GUIDES["wbpms-unmarried"];
    return REDIRECT_GUIDES["wbpms-general"];
  }

  // Janma-Mrityu Tathya fallback
  if (key.includes("birth") || key.includes("janma")) {
    return REDIRECT_GUIDES["birth-new"];
  }

  if (key.includes("death") || key.includes("mrityu")) {
    return REDIRECT_GUIDES["death-new"];
  }

  return REDIRECT_GUIDES["wbpms-general"];
}
