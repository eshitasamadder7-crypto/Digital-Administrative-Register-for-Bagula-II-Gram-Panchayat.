/**
 * BAGULA II GRAM PANCHAYAT - ELECTED REPRESENTATIVES & BOOTH-SANSAD MASTER DATA SERVICE
 * 
 * Sourced directly from PGE-2023 Official Register & Delimitation:
 * - 30 Elected Members across 30 Gram Sansads (Ward 1 to 30 / Sansad I to XXX)
 * - 33 Polling Booths (Part No. 21 to 53)
 * 
 * Structural Logic:
 * - Sansad IX (Ward 9) -> Dual Booths: Parts 29 & 30 (Single Elected Member: Sima Tikadar)
 * - Sansad X (Ward 10) -> Dual Booths: Parts 31 & 32 (Single Elected Member: Koushallya Mridha)
 * - Sansad XVII (Ward 17) -> Dual Booths: Parts 39 & 40 (Single Elected Member: Iti Majumder)
 * - All other 27 Sansads -> 1 Polling Booth each
 * Total: 30 Sansads / Members, 33 Polling Booths
 * 
 * Future Integration:
 * Used by Warish application entry forms (selecting Sansad auto-links to representative profile)
 * and Member Profile view modules.
 */

export interface ElectedRepresentativeRecord {
  slNo: number;
  name: string;
  nameBn: string;
  address: string;
  partNo: string;
  boothNumbers: number[];
  sansadNo: string; // Roman Numeral e.g. "I", "IX", "XXX"
  wardNumber: number; // 1 to 30
  caste: "S.C" | "GEN" | "S.T" | "OBC" | string;
  bank: string;
  ifscCode: string;
  contact: string;
  aadhaarNo: string;
  panNo: string;
  email: string;
  designation: "Prodhan" | "Upa-Prodhan" | "Ward Member";
  partyName: string;
  partyLogoUrl: string;
  photoUrl?: string | null;
  isDualBooth?: boolean;
}

export interface BoothSansadMapping {
  boothNumber: number; // 21 to 53
  partNo: number;
  sansadNo: string;
  wardNumber: number;
  boothName: string;
  boothNameBn: string;
  location: string;
  representativeName: string;
  isSharedSansad: boolean; // true for 29, 30, 31, 32, 39, 40
}

export interface PanchayatSamitiRepresentative {
  slNo: number;
  name: string;
  nameBn: string;
  address: string;
  contact: string | null;
  designation: string;
}

/**
 * Authoritative 30 Elected Members of Bagula II Gram Panchayat (PGE-2023).
 */
export const ELECTED_REPRESENTATIVES_DATA: ElectedRepresentativeRecord[] = [
  {
    slNo: 1,
    name: "NANDINI BISWAS",
    nameBn: "নন্দিনী বিশ্বাস",
    address: "MILANNAGAR PURBA",
    partNo: "21",
    boothNumbers: [21],
    sansadNo: "I",
    wardNumber: 1,
    caste: "S.C",
    bank: "BANK OF INDIA 429410510000622",
    ifscCode: "BKID0004294",
    contact: "7797943811",
    aadhaarNo: "564708105344",
    panNo: "CUFPB6664L",
    email: "nandinibiswas24011993@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 2,
    name: "KUSUM BAIRAGI",
    nameBn: "কুসুম বৈরাগী",
    address: "MILANNAGAR EAST",
    partNo: "22",
    boothNumbers: [22],
    sansadNo: "II",
    wardNumber: 2,
    caste: "S.C",
    bank: "BGVB 5031020010092",
    ifscCode: "PUNB0RRBBGB",
    contact: "9093730989",
    aadhaarNo: "981451011818",
    panNo: "GVFPB8848P",
    email: "mrinmaybairagi405@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 3,
    name: "ITI BISWAS SANNYASI",
    nameBn: "ইতি বিশ্বাস সন্ন্যাসী",
    address: "MILANNAGAR",
    partNo: "23",
    boothNumbers: [23],
    sansadNo: "III",
    wardNumber: 3,
    caste: "S.C",
    bank: "BGVB 5031010010356",
    ifscCode: "PUNB0RRBBGB",
    contact: "8927063297",
    aadhaarNo: "913837156486",
    panNo: "GNYPS2364N",
    email: "subendukumarbiswas@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 4,
    name: "SUPRIYA BISWAS",
    nameBn: "সুপ্রিয়া বিশ্বাস",
    address: "MILANNAGAR PASCHIM",
    partNo: "24",
    boothNumbers: [24],
    sansadNo: "IV",
    wardNumber: 4,
    caste: "S.C",
    bank: "SBI 41054616181",
    ifscCode: "SBIN0001302",
    contact: "9064306830",
    aadhaarNo: "742250892636",
    panNo: "HHEPM6611K",
    email: "supriyabiseas6@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 5,
    name: "UJJAL BISWAS",
    nameBn: "উজ্জ্বল বিশ্বাস",
    address: "BARAMURAGACHA",
    partNo: "25",
    boothNumbers: [25],
    sansadNo: "V",
    wardNumber: 5,
    caste: "S.C",
    bank: "SBI 35621405072",
    ifscCode: "SBIN0001302",
    contact: "8927090253",
    aadhaarNo: "558708523812",
    panNo: "BVPPB0263H",
    email: "bujjal048@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 6,
    name: "SABITA BISWAS DAS",
    nameBn: "সবিতা বিশ্বাস দাস",
    address: "MILANNAGAR PASCHIM",
    partNo: "26",
    boothNumbers: [26],
    sansadNo: "VI",
    wardNumber: 6,
    caste: "S.C",
    bank: "BGVB 5031010002375",
    ifscCode: "PUNB0RRBBGB",
    contact: "7407247731",
    aadhaarNo: "567840579359",
    panNo: "AOMPD2929M",
    email: "tapansabita007@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 7,
    name: "NIBADITA DUTTA ROY",
    nameBn: "নিবেদিতা দত্ত রায়",
    address: "BAGULA STATION PARA",
    partNo: "27",
    boothNumbers: [27],
    sansadNo: "VII",
    wardNumber: 7,
    caste: "S.C",
    bank: "BANK OF BARODA 19840100016614",
    ifscCode: "BARB0MAYNAD",
    contact: "6294198713",
    aadhaarNo: "567760871274",
    panNo: "BVGPR9555P",
    email: "nibaditadutta45@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 8,
    name: "AKHIL KUMAR BISWAS",
    nameBn: "অখিল কুমার বিশ্বাস",
    address: "STATION PARA",
    partNo: "28",
    boothNumbers: [28],
    sansadNo: "VIII",
    wardNumber: 8,
    caste: "S.C",
    bank: "SBI 11262256725",
    ifscCode: "SBIN0001302",
    contact: "8158993455",
    aadhaarNo: "201156861435",
    panNo: "CUSPB3713M",
    email: "biswasakhil277@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 9,
    name: "SIMA TIKADAR",
    nameBn: "সীমা টিকাদার",
    address: "BAGULA STATION PARA",
    partNo: "29, 30",
    boothNumbers: [29, 30],
    sansadNo: "IX",
    wardNumber: 9,
    caste: "S.C",
    bank: "BGVB 031010045702",
    ifscCode: "PUNB0RRBBGB",
    contact: "9933134367",
    aadhaarNo: "332671202409",
    panNo: "CCKPT2359D",
    email: "simatikader836@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: true,
  },
  {
    slNo: 10,
    name: "KOUSHALLYA MRIDHA",
    nameBn: "কৌশল্যা মৃধা",
    address: "MURAGCHA COLONY",
    partNo: "31, 32",
    boothNumbers: [31, 32],
    sansadNo: "X",
    wardNumber: 10,
    caste: "S.C",
    bank: "SBI 11262287266",
    ifscCode: "SBIN0001302",
    contact: "8116399917",
    aadhaarNo: "746369052636",
    panNo: "AXEPM3458P",
    email: "koushallya1965@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: true,
  },
  {
    slNo: 11,
    name: "SUSMITA BISWAS BARMAN",
    nameBn: "সুস্মিতা বিশ্বাস বর্মন",
    address: "BARAMURAGACHA",
    partNo: "33",
    boothNumbers: [33],
    sansadNo: "XI",
    wardNumber: 11,
    caste: "S.C",
    bank: "SBI 34399011970",
    ifscCode: "SBIN0001302",
    contact: "6296108978",
    aadhaarNo: "312039957684",
    panNo: "EYZPB9639F",
    email: "susmitabarman691994@gmail.com",
    designation: "Prodhan",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 12,
    name: "BANDANA BARMAN",
    nameBn: "বন্দনা বর্মন",
    address: "PURATAN PARA",
    partNo: "34",
    boothNumbers: [34],
    sansadNo: "XII",
    wardNumber: 12,
    caste: "S.C",
    bank: "SBI 30685791384",
    ifscCode: "SBIN0001302",
    contact: "9775820375",
    aadhaarNo: "224228462218",
    panNo: "BLEPB9585R",
    email: "subratobarman979@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 13,
    name: "GOBINDA GHOSH",
    nameBn: "গোবিন্দ ঘোষ",
    address: "BARAMURAGACHA",
    partNo: "35",
    boothNumbers: [35],
    sansadNo: "XIII",
    wardNumber: 13,
    caste: "GEN",
    bank: "SBI 33286797887",
    ifscCode: "SBIN0001302",
    contact: "7501237108",
    aadhaarNo: "907037593253",
    panNo: "BLBPG8559H",
    email: "ggobindaghosh289@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 14,
    name: "GAUTAM BISWAS",
    nameBn: "গৌতম বিশ্বাস",
    address: "BAGULA STATION PARA",
    partNo: "36",
    boothNumbers: [36],
    sansadNo: "XIV",
    wardNumber: 14,
    caste: "S.C",
    bank: "BANDHAN BANK 50200002836346",
    ifscCode: "BOBL0001052",
    contact: "9339032828",
    aadhaarNo: "283673276467",
    panNo: "DCWPB1614N",
    email: "gb940468@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 15,
    name: "TANUSHREE BISWAS",
    nameBn: "তনুশ্রী বিশ্বাস",
    address: "BAGULA MADHYA PARA",
    partNo: "37",
    boothNumbers: [37],
    sansadNo: "XV",
    wardNumber: 15,
    caste: "GEN",
    bank: "INDIAN BANK 50150433643",
    ifscCode: "IDIB000B543",
    contact: "8250412242",
    aadhaarNo: "961152243414",
    panNo: "BXXPB3736K",
    email: "sagar.bagula@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 16,
    name: "RABINDRA NATH GHOSH",
    nameBn: "রবীন্দ্র নাথ ঘোষ",
    address: "BAGULA PURATAN PARA",
    partNo: "38",
    boothNumbers: [38],
    sansadNo: "XVI",
    wardNumber: 16,
    caste: "GEN",
    bank: "SBI 11262216748",
    ifscCode: "SBIN0001302",
    contact: "9475274545",
    aadhaarNo: "546267279971",
    panNo: "AMEPG7079D",
    email: "rabindranathbagula@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 17,
    name: "ITI MAJUMDER",
    nameBn: "ইতি মজুমদার",
    address: "SAHAPUR",
    partNo: "39, 40",
    boothNumbers: [39, 40],
    sansadNo: "XVII",
    wardNumber: 17,
    caste: "S.C",
    bank: "BANK OF INDIA 429410110014984",
    ifscCode: "BKID0004294",
    contact: "6295742619",
    aadhaarNo: "340143464004",
    panNo: "IONPM5529H",
    email: "sayan12345.sm@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: true,
  },
  {
    slNo: 18,
    name: "SUKHEN MONDAL",
    nameBn: "সুখেন মণ্ডল",
    address: "SAHAPUR",
    partNo: "41",
    boothNumbers: [41],
    sansadNo: "XVIII",
    wardNumber: 18,
    caste: "S.C",
    bank: "PNB 1993010094142",
    ifscCode: "PUNB0199320",
    contact: "9883945813",
    aadhaarNo: "764711153641",
    panNo: "FORPM7530F",
    email: "mondalsuku1@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 19,
    name: "CHANI BISWAS",
    nameBn: "চানি বিশ্বাস",
    address: "BAGULA COLLEGE PARA SOUTH EAST",
    partNo: "42",
    boothNumbers: [42],
    sansadNo: "XIX",
    wardNumber: 19,
    caste: "S.C",
    bank: "BANK OF INDIA 429410110018520",
    ifscCode: "BKID0004294",
    contact: "7365864474",
    aadhaarNo: "452430210797",
    panNo: "BBAPB8286R",
    email: "chanibiswas81@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 20,
    name: "RANI DUTTA",
    nameBn: "রাণী দত্ত",
    address: "COLLEGE PARA",
    partNo: "43",
    boothNumbers: [43],
    sansadNo: "XX",
    wardNumber: 20,
    caste: "GEN",
    bank: "BANK OF BORODA 19840100009878",
    ifscCode: "BARB0MAYNAD",
    contact: "7908373473",
    aadhaarNo: "316954867937",
    panNo: "BUUPD2546R",
    email: "ranidutta888@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 21,
    name: "SOMA BISWAS",
    nameBn: "সোমা বিশ্বাস",
    address: "BAGULA MADHYA PARA",
    partNo: "44",
    boothNumbers: [44],
    sansadNo: "XXI",
    wardNumber: 21,
    caste: "S.C",
    bank: "INDIAN BANK 50174735569",
    ifscCode: "IDIB000B543",
    contact: "7003801782",
    aadhaarNo: "983462022676",
    panNo: "DIRPB0339B",
    email: "biswassoma907@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 22,
    name: "RAKESH BISWAS",
    nameBn: "রাকেশ বিশ্বাস",
    address: "SAHAPUR",
    partNo: "45",
    boothNumbers: [45],
    sansadNo: "XXII",
    wardNumber: 22,
    caste: "S.C",
    bank: "BANDHAN BANK 50210016990170",
    ifscCode: "BOBL0001052",
    contact: "9749653509",
    aadhaarNo: "612871458247",
    panNo: "BRUPB3474R",
    email: "rbiswas01011985@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 23,
    name: "KANAK BISWAS",
    nameBn: "কনক বিশ্বাস",
    address: "BAGULA STATION PARA",
    partNo: "46",
    boothNumbers: [46],
    sansadNo: "XXIII",
    wardNumber: 23,
    caste: "S.C",
    bank: "SBI 34711384055",
    ifscCode: "SBIN0001302",
    contact: "9002823400",
    aadhaarNo: "685241731428",
    panNo: "AHOPB2484N",
    email: "kanakbg17@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 24,
    name: "SUJOY BISWAS",
    nameBn: "সুজয় বিশ্বাস",
    address: "BAGULA COLLEGE PARA",
    partNo: "47",
    boothNumbers: [47],
    sansadNo: "XXIV",
    wardNumber: 24,
    caste: "S.C",
    bank: "BANK OF INDIA 429410110003550",
    ifscCode: "BKID0004294",
    contact: "7047610861",
    aadhaarNo: "834813709020",
    panNo: "CCDPB9962P",
    email: "sujaybiswas3689@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 25,
    name: "CHAMPA SIKDER",
    nameBn: "চম্পা শিকদার",
    address: "BAGULA STATION PARA",
    partNo: "48",
    boothNumbers: [48],
    sansadNo: "XXV",
    wardNumber: 25,
    caste: "S.C",
    bank: "SBI 31893810111",
    ifscCode: "SBIN0001302",
    contact: "8116457950",
    aadhaarNo: "644696426513",
    panNo: "JAWPS2360L",
    email: "champasikdar270@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 26,
    name: "SWAPAN KUMAR SARKAR",
    nameBn: "স্বপন কুমার সরকার",
    address: "BAGAULA COLLEGE PARA SOUTH",
    partNo: "49",
    boothNumbers: [49],
    sansadNo: "XXVI",
    wardNumber: 26,
    caste: "S.C",
    bank: "SBI 11262252233",
    ifscCode: "SBIN0001302",
    contact: "8317892156",
    aadhaarNo: "285601448164",
    panNo: "BPBPS4833N",
    email: "shyamal.sarkar222@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 27,
    name: "APARNA PODDAR",
    nameBn: "অপর্ণা পোদ্দার",
    address: "BAGULA COLLEGE PARA",
    partNo: "50",
    boothNumbers: [50],
    sansadNo: "XXVII",
    wardNumber: 27,
    caste: "S.C",
    bank: "BGVB 5031010030436",
    ifscCode: "PUNB0RRBBGB",
    contact: "9932285723",
    aadhaarNo: "956926927864",
    panNo: "DDJPP3220E",
    email: "podderaparna46@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 28,
    name: "SHARAT MINJI",
    nameBn: "শরৎ মিঞ্জি",
    address: "MADNA",
    partNo: "51",
    boothNumbers: [51],
    sansadNo: "XXVIII",
    wardNumber: 28,
    caste: "S.T",
    bank: "SBI 35920395538",
    ifscCode: "SBIN0001302",
    contact: "9735356490",
    aadhaarNo: "783445541543",
    panNo: "DDBPM2467J",
    email: "bujjal048@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 29,
    name: "FIROJ MANDAL",
    nameBn: "ফিরোজ মণ্ডল",
    address: "HATIBANDHA",
    partNo: "52",
    boothNumbers: [52],
    sansadNo: "XXIX",
    wardNumber: 29,
    caste: "GEN",
    bank: "SBI 32341923445",
    ifscCode: "SBIN0001302",
    contact: "9679370096 / 8116594476",
    aadhaarNo: "358648032535",
    panNo: "BNOPM8305C",
    email: "fm934884@gmail.com",
    designation: "Ward Member",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
  {
    slNo: 30,
    name: "MANORANJAN BHOWMICK",
    nameBn: "মনোরঞ্জন ভৌমিক",
    address: "SANTINAGAR",
    partNo: "53",
    boothNumbers: [53],
    sansadNo: "XXX",
    wardNumber: 30,
    caste: "OBC",
    bank: "SBI 30829805900",
    ifscCode: "SBIN0001302",
    contact: "7001637973",
    aadhaarNo: "410299063310",
    panNo: "ALNPB9589P",
    email: "manoranjanbhawmick@gmail.com",
    designation: "Upa-Prodhan",
    partyName: "All India Trinamool Congress",
    partyLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    photoUrl: null,
    isDualBooth: false,
  },
];

/**
 * 33 Polling Booths (Parts 21 to 53) mapped to the 30 Sansads.
 */
export const BOOTHS_SANSAD_MAPPINGS: BoothSansadMapping[] = [
  { boothNumber: 21, partNo: 21, sansadNo: "I", wardNumber: 1, boothName: "Milannagar Purba Free Primary School", boothNameBn: "মিলননগর পূর্ব অবৈতনিক প্রাথমিক বিদ্যালয়", location: "Milannagar Purba", representativeName: "NANDINI BISWAS", isSharedSansad: false },
  { boothNumber: 22, partNo: 22, sansadNo: "II", wardNumber: 2, boothName: "Milannagar East Primary School", boothNameBn: "মিলননগর ইস্ট প্রাথমিক বিদ্যালয়", location: "Milannagar East", representativeName: "KUSUM BAIRAGI", isSharedSansad: false },
  { boothNumber: 23, partNo: 23, sansadNo: "III", wardNumber: 3, boothName: "Milannagar Primary School", boothNameBn: "মিলননগর প্রাথমিক বিদ্যালয়", location: "Milannagar", representativeName: "ITI BISWAS SANNYASI", isSharedSansad: false },
  { boothNumber: 24, partNo: 24, sansadNo: "IV", wardNumber: 4, boothName: "Milannagar Paschim Sishu Siksha Kendra", boothNameBn: "মিলননগর পশ্চিম শিশু শিক্ষা কেন্দ্র", location: "Milannagar Paschim", representativeName: "SUPRIYA BISWAS", isSharedSansad: false },
  { boothNumber: 25, partNo: 25, sansadNo: "V", wardNumber: 5, boothName: "Bara Muragacha Primary School - Room 1", boothNameBn: "বড় মুড়াগাছা প্রাথমিক বিদ্যালয় - কক্ষ ১", location: "Baramuragacha", representativeName: "UJJAL BISWAS", isSharedSansad: false },
  { boothNumber: 26, partNo: 26, sansadNo: "VI", wardNumber: 6, boothName: "Milannagar Paschim Community Hall", boothNameBn: "মিলননগর পশ্চিম কমিউনিটি হল", location: "Milannagar Paschim", representativeName: "SABITA BISWAS DAS", isSharedSansad: false },
  { boothNumber: 27, partNo: 27, sansadNo: "VII", wardNumber: 7, boothName: "Bagula Station Para Free Primary School", boothNameBn: "বগুলা স্টেশনপাড়া অবৈতনিক প্রাথমিক বিদ্যালয়", location: "Bagula Station Para", representativeName: "NIBADITA DUTTA ROY", isSharedSansad: false },
  { boothNumber: 28, partNo: 28, sansadNo: "VIII", wardNumber: 8, boothName: "Station Para Sishu Siksha Kendra", boothNameBn: "স্টেশনপাড়া শিশু শিক্ষা কেন্দ্র", location: "Station Para", representativeName: "AKHIL KUMAR BISWAS", isSharedSansad: false },
  { boothNumber: 29, partNo: 29, sansadNo: "IX", wardNumber: 9, boothName: "Bagula Station Para High School (North Wing)", boothNameBn: "বগুলা স্টেশনপাড়া উচ্চ বিদ্যালয় (উত্তর বিভাগ)", location: "Bagula Station Para", representativeName: "SIMA TIKADAR", isSharedSansad: true },
  { boothNumber: 30, partNo: 30, sansadNo: "IX", wardNumber: 9, boothName: "Bagula Station Para High School (South Wing)", boothNameBn: "বগুলা স্টেশনপাড়া উচ্চ বিদ্যালয় (দক্ষিণ বিভাগ)", location: "Bagula Station Para", representativeName: "SIMA TIKADAR", isSharedSansad: true },
  { boothNumber: 31, partNo: 31, sansadNo: "X", wardNumber: 10, boothName: "Muragacha Colony Primary School - Room 1", boothNameBn: "মুড়াগাছা কলোনি প্রাথমিক বিদ্যালয় - কক্ষ ১", location: "Muragcha Colony", representativeName: "KOUSHALLYA MRIDHA", isSharedSansad: true },
  { boothNumber: 32, partNo: 32, sansadNo: "X", wardNumber: 10, boothName: "Muragacha Colony Primary School - Room 2", boothNameBn: "মুড়াগাছা কলোনি প্রাথমিক বিদ্যালয় - কক্ষ ২", location: "Muragcha Colony", representativeName: "KOUSHALLYA MRIDHA", isSharedSansad: true },
  { boothNumber: 33, partNo: 33, sansadNo: "XI", wardNumber: 11, boothName: "Bagula II Gram Panchayat Office Building", boothNameBn: "বগুলা ২ নং গ্রাম পঞ্চায়েত কার্যালয় ভবন", location: "Baramuragacha", representativeName: "SUSMITA BISWAS BARMAN", isSharedSansad: false },
  { boothNumber: 34, partNo: 34, sansadNo: "XII", wardNumber: 12, boothName: "Puratan Para Primary School", boothNameBn: "পুরাতনপাড়া প্রাথমিক বিদ্যালয়", location: "Puratan Para", representativeName: "BANDANA BARMAN", isSharedSansad: false },
  { boothNumber: 35, partNo: 35, sansadNo: "XIII", wardNumber: 13, boothName: "Baramuragacha Milan Sangha Hall", boothNameBn: "বড় মুড়াগাছা মিলন সংঘ হল", location: "Baramuragacha", representativeName: "GOBINDA GHOSH", isSharedSansad: false },
  { boothNumber: 36, partNo: 36, sansadNo: "XIV", wardNumber: 14, boothName: "Bagula Station Para Boys School", boothNameBn: "বগুলা স্টেশনপাড়া বালক বিদ্যালয়", location: "Bagula Station Para", representativeName: "GAUTAM BISWAS", isSharedSansad: false },
  { boothNumber: 37, partNo: 37, sansadNo: "XV", wardNumber: 15, boothName: "Bagula Madhya Para Primary School", boothNameBn: "বগুলা মধ্যপাড়া প্রাথমিক বিদ্যালয়", location: "Bagula Madhya Para", representativeName: "TANUSHREE BISWAS", isSharedSansad: false },
  { boothNumber: 38, partNo: 38, sansadNo: "XVI", wardNumber: 16, boothName: "Bagula Puratan Para Junior High School", boothNameBn: "বগুলা পুরাতনপাড়া জুনিয়র হাই স্কুল", location: "Bagula Puratan Para", representativeName: "RABINDRA NATH GHOSH", isSharedSansad: false },
  { boothNumber: 39, partNo: 39, sansadNo: "XVII", wardNumber: 17, boothName: "Sahapur Free Primary School - Room 1", boothNameBn: "সাহাপুর অবৈতনিক প্রাথমিক বিদ্যালয় - কক্ষ ১", location: "Sahapur", representativeName: "ITI MAJUMDER", isSharedSansad: true },
  { boothNumber: 40, partNo: 40, sansadNo: "XVII", wardNumber: 17, boothName: "Sahapur Free Primary School - Room 2", boothNameBn: "সাহাপুর অবৈতনিক প্রাথমিক বিদ্যালয় - কক্ষ ২", location: "Sahapur", representativeName: "ITI MAJUMDER", isSharedSansad: true },
  { boothNumber: 41, partNo: 41, sansadNo: "XVIII", wardNumber: 18, boothName: "Sahapur Sishu Siksha Kendra", boothNameBn: "সাহাপুর শিশু শিক্ষা কেন্দ্র", location: "Sahapur", representativeName: "SUKHEN MONDAL", isSharedSansad: false },
  { boothNumber: 42, partNo: 42, sansadNo: "XIX", wardNumber: 19, boothName: "Bagula College Para South East Community Hall", boothNameBn: "বগুলা কলেজপাড়া দক্ষিণ-পূর্ব কমিউনিটি হল", location: "Bagula College Para South East", representativeName: "CHANI BISWAS", isSharedSansad: false },
  { boothNumber: 43, partNo: 43, sansadNo: "XX", wardNumber: 20, boothName: "College Para Free Primary School", boothNameBn: "কলেজপাড়া অবৈতনিক প্রাথমিক বিদ্যালয়", location: "College Para", representativeName: "RANI DUTTA", isSharedSansad: false },
  { boothNumber: 44, partNo: 44, sansadNo: "XXI", wardNumber: 21, boothName: "Bagula Madhya Para Anganwadi Centre", boothNameBn: "বগুলা মধ্যপাড়া অঙ্গনওয়াড়ি কেন্দ্র", location: "Bagula Madhya Para", representativeName: "SOMA BISWAS", isSharedSansad: false },
  { boothNumber: 45, partNo: 45, sansadNo: "XXII", wardNumber: 22, boothName: "Sahapur Junior High School", boothNameBn: "সাহাপুর জুনিয়র হাই স্কুল", location: "Sahapur", representativeName: "RAKESH BISWAS", isSharedSansad: false },
  { boothNumber: 46, partNo: 46, sansadNo: "XXIII", wardNumber: 23, boothName: "Bagula Station Para Girls High School", boothNameBn: "বগুলা স্টেশনপাড়া বালিকা বিদ্যালয়", location: "Bagula Station Para", representativeName: "KANAK BISWAS", isSharedSansad: false },
  { boothNumber: 47, partNo: 47, sansadNo: "XXIV", wardNumber: 24, boothName: "Bagula College Para Sri Krishna College Campus", boothNameBn: "বগুলা কলেজপাড়া শ্রীকৃষ্ণ কলেজ ক্যাম্পাস", location: "Bagula College Para", representativeName: "SUJOY BISWAS", isSharedSansad: false },
  { boothNumber: 48, partNo: 48, sansadNo: "XXV", wardNumber: 25, boothName: "Bagula Station Para Milan Tirtha", boothNameBn: "বগুলা স্টেশনপাড়া মিলন তীর্থ", location: "Bagula Station Para", representativeName: "CHAMPA SIKDER", isSharedSansad: false },
  { boothNumber: 49, partNo: 49, sansadNo: "XXVI", wardNumber: 26, boothName: "Bagula College Para South Primary School", boothNameBn: "বগুলা কলেজপাড়া দক্ষিণ প্রাথমিক বিদ্যালয়", location: "Bagaula College Para South", representativeName: "SWAPAN KUMAR SARKAR", isSharedSansad: false },
  { boothNumber: 50, partNo: 50, sansadNo: "XXVII", wardNumber: 27, boothName: "Bagula College Para Community Hall", boothNameBn: "বগুলা কলেজপাড়া কমিউনিটি হল", location: "Bagula College Para", representativeName: "APARNA PODDAR", isSharedSansad: false },
  { boothNumber: 51, partNo: 51, sansadNo: "XXVIII", wardNumber: 28, boothName: "Madna Free Primary School", boothNameBn: "মাদনা অবৈতনিক প্রাথমিক বিদ্যালয়", location: "Madna", representativeName: "SHARAT MINJI", isSharedSansad: false },
  { boothNumber: 52, partNo: 52, sansadNo: "XXIX", wardNumber: 29, boothName: "Hatibandha Primary School", boothNameBn: "হাতিবান্ধা প্রাথমিক বিদ্যালয়", location: "Hatibandha", representativeName: "FIROJ MANDAL", isSharedSansad: false },
  { boothNumber: 53, partNo: 53, sansadNo: "XXX", wardNumber: 30, boothName: "Santinagar Free Primary School", boothNameBn: "শান্তিনগর অবৈতনিক প্রাথমিক বিদ্যালয়", location: "Santinagar", representativeName: "MANORANJAN BHOWMICK", isSharedSansad: false },
];

/**
 * Associated Panchayat Samiti representatives representing Bagula II GP jurisdiction.
 */
export const PANCHAYAT_SAMITI_REPRESENTATIVES: PanchayatSamitiRepresentative[] = [
  {
    slNo: 31,
    name: "NABIN GHOSH",
    nameBn: "নবীন ঘোষ",
    address: "SAHAPUR",
    contact: "8918950421",
    designation: "Panchayat Samiti Member / Representative",
  },
  {
    slNo: 32,
    name: "ANJALI BISWAS",
    nameBn: "অঞ্জলি বিশ্বাস",
    address: "MURAGCHA COLONY",
    contact: null,
    designation: "Panchayat Samiti Member / Representative",
  },
  {
    slNo: 33,
    name: "ANANDA KABIRAJ",
    nameBn: "আনন্দ কবিরাজ",
    address: "STATION PARA",
    contact: null,
    designation: "Panchayat Samiti Member / Representative",
  },
];

// ============================================================================
// SERVICE / LOOKUP HELPER FUNCTIONS
// ============================================================================

/**
 * Normalizes a Sansad identifier (e.g., "Sansad IX", "IX", 9, "9") to a ward number (1 to 30).
 */
export function normalizeSansadToWard(sansadOrWard: string | number): number | null {
  if (typeof sansadOrWard === "number") {
    return sansadOrWard >= 1 && sansadOrWard <= 30 ? sansadOrWard : null;
  }
  const clean = sansadOrWard.trim().toUpperCase().replace(/^SANSAD\s*/i, "").replace(/^WARD\s*/i, "").replace(/^#/, "");
  const num = parseInt(clean, 10);
  if (!isNaN(num) && num >= 1 && num <= 30) {
    return num;
  }
  // Lookup by Roman numeral
  const found = ELECTED_REPRESENTATIVES_DATA.find((r) => r.sansadNo.toUpperCase() === clean);
  return found ? found.wardNumber : null;
}

/**
 * Retrieves the elected representative record by Sansad No. (Roman numeral) or Ward Number.
 * Helpful for Warish application entries and linking member profiles.
 */
export function getRepresentativeBySansad(sansadOrWard: string | number): ElectedRepresentativeRecord | undefined {
  const ward = normalizeSansadToWard(sansadOrWard);
  if (!ward) return undefined;
  return ELECTED_REPRESENTATIVES_DATA.find((r) => r.wardNumber === ward);
}

/**
 * Retrieves the representative by polling booth number (Parts 21 to 53).
 */
export function getRepresentativeByBooth(boothNumber: number): ElectedRepresentativeRecord | undefined {
  return ELECTED_REPRESENTATIVES_DATA.find((r) => r.boothNumbers.includes(boothNumber));
}

/**
 * Retrieves all Polling Booth numbers assigned to a given Sansad or Ward.
 * (Returns [29, 30] for Sansad IX / Ward 9; [31, 32] for Sansad X / Ward 10; [39, 40] for Sansad XVII / Ward 17)
 */
export function getBoothsForSansad(sansadOrWard: string | number): number[] {
  const rep = getRepresentativeBySansad(sansadOrWard);
  return rep ? rep.boothNumbers : [];
}

/**
 * Returns formatted Sansad options for Warish application forms and admin pickers.
 */
export function getSansadOptions(): Array<{
  value: string; // Sansad Roman Numeral e.g. "IX"
  label: string; // Formatted label for user selection
  wardNumber: number;
  sansadNo: string;
  representativeName: string;
  boothsText: string;
  isDualBooth: boolean;
}> {
  return ELECTED_REPRESENTATIVES_DATA.map((r) => ({
    value: r.sansadNo,
    label: `Sansad ${r.sansadNo} (Ward #${r.wardNumber}) — ${r.name} [Part #${r.partNo}]`,
    wardNumber: r.wardNumber,
    sansadNo: r.sansadNo,
    representativeName: r.name,
    boothsText: r.partNo,
    isDualBooth: Boolean(r.isDualBooth),
  }));
}

/**
 * Safely masks or scrubs sensitive personally identifiable information (Aadhaar, PAN, Bank)
 * for public citizen viewing as required by government data protection & project rules.
 */
export function getPublicRepresentativeView(rep: ElectedRepresentativeRecord) {
  return {
    slNo: rep.slNo,
    name: rep.name,
    nameBn: rep.nameBn,
    sansadNo: rep.sansadNo,
    wardNumber: rep.wardNumber,
    address: rep.address,
    partNo: rep.partNo,
    boothNumbers: rep.boothNumbers,
    caste: rep.caste,
    designation: rep.designation,
    partyName: rep.partyName,
    partyLogoUrl: rep.partyLogoUrl,
    contact: rep.contact,
    email: rep.email,
    isDualBooth: rep.isDualBooth,
  };
}
