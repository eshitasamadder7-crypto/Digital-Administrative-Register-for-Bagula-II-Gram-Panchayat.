import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  getPartyColorConfig,
  saveLocalPartyOverride,
  getLocalPartyOverrides,
  type PartyColorTheme,
} from "./partyColorConfig";
import {
  ELECTED_REPRESENTATIVES_DATA,
  type ElectedRepresentativeRecord,
} from "./electedRepresentativesData";

export interface MasterParty {
  id: string;
  party_code: string;
  party_name: string;
  party_name_bn: string | null;
  party_logo_url: string | null;
  symbol_name: string | null;
  color_code: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface MasterBooth {
  id: string;
  booth_number: number;
  booth_name: string;
  booth_name_bn: string | null;
  ward_number: number;
  village_name: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ElectedMember {
  id: string;
  name: string;
  name_bn: string | null;
  designation: string;
  ward_number: number;
  sansad_number?: string | null;
  booth_id: string | null;
  booth_number: number | null;
  booth_numbers?: string | null;
  part_no?: string | null;
  party_id: string | null;
  party_name: string | null;
  party_logo_url: string | null;
  village: string | null;
  address?: string | null;
  caste?: string | null;
  bank_name?: string | null;
  ifsc_code?: string | null;
  contact?: string | null;
  phone: string | null;
  email: string | null;
  aadhaar_no?: string | null;
  pan_no?: string | null;
  photo_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Joined or resolved
  booth_name?: string | null;
  party_code?: string | null;
  color_code?: string | null;
  party_theme?: PartyColorTheme;
}

export interface AppAttachment {
  id: string;
  parent_entity: string;
  parent_id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  storage_path: string;
  public_url: string;
  description: string | null;
  created_at: string;
}

/**
 * Authoritative 33 Polling Booths (Parts 21 to 53) for Bagula II GP across 30 Wards (Sansads).
 * Logic:
 * - Wards 1 to 8 -> Parts 21 to 28
 * - Ward 9 (Sansad IX) -> Parts 29 & 30 (2 booths, 1 ward/member)
 * - Ward 10 (Sansad X) -> Parts 31 & 32 (2 booths, 1 ward/member)
 * - Wards 11 to 16 -> Parts 33 to 38
 * - Ward 17 (Sansad XVII) -> Parts 39 & 40 (2 booths, 1 ward/member)
 * - Wards 18 to 30 -> Parts 41 to 53
 * Total: 33 booths, 30 sansads/wards.
 */
export const FALLBACK_BOOTHS: MasterBooth[] = [
  { id: "booth-21", booth_number: 21, booth_name: "Milannagar Purba Free Primary School", booth_name_bn: "মিলননগর পূর্ব অবৈতনিক প্রাথমিক বিদ্যালয়", ward_number: 1, village_name: "Milannagar Purba", sort_order: 1, is_active: true },
  { id: "booth-22", booth_number: 22, booth_name: "Milannagar East Primary School", booth_name_bn: "মিলননগর ইস্ট প্রাথমিক বিদ্যালয়", ward_number: 2, village_name: "Milannagar East", sort_order: 2, is_active: true },
  { id: "booth-23", booth_number: 23, booth_name: "Milannagar Primary School", booth_name_bn: "মিলননগর প্রাথমিক বিদ্যালয়", ward_number: 3, village_name: "Milannagar", sort_order: 3, is_active: true },
  { id: "booth-24", booth_number: 24, booth_name: "Milannagar Paschim Sishu Siksha Kendra", booth_name_bn: "মিলননগর পশ্চিম শিশু শিক্ষা কেন্দ্র", ward_number: 4, village_name: "Milannagar Paschim", sort_order: 4, is_active: true },
  { id: "booth-25", booth_number: 25, booth_name: "Bara Muragacha Primary School - Room 1", booth_name_bn: "বড় মুড়াগাছা প্রাথমিক বিদ্যালয় - কক্ষ ১", ward_number: 5, village_name: "Baramuragacha", sort_order: 5, is_active: true },
  { id: "booth-26", booth_number: 26, booth_name: "Milannagar Paschim Community Hall", booth_name_bn: "মিলননগর পশ্চিম কমিউনিটি হল", ward_number: 6, village_name: "Milannagar Paschim", sort_order: 6, is_active: true },
  { id: "booth-27", booth_number: 27, booth_name: "Bagula Station Para Free Primary School", booth_name_bn: "বগুলা স্টেশনপাড়া অবৈতনিক প্রাথমিক বিদ্যালয়", ward_number: 7, village_name: "Bagula Station Para", sort_order: 7, is_active: true },
  { id: "booth-28", booth_number: 28, booth_name: "Station Para Sishu Siksha Kendra", booth_name_bn: "স্টেশনপাড়া শিশু শিক্ষা কেন্দ্র", ward_number: 8, village_name: "Station Para", sort_order: 8, is_active: true },
  { id: "booth-29", booth_number: 29, booth_name: "Bagula Station Para High School (North Wing)", booth_name_bn: "বগুলা স্টেশনপাড়া উচ্চ বিদ্যালয় (উত্তর বিভাগ)", ward_number: 9, village_name: "Bagula Station Para", sort_order: 9, is_active: true },
  { id: "booth-30", booth_number: 30, booth_name: "Bagula Station Para High School (South Wing)", booth_name_bn: "বগুলা স্টেশনপাড়া উচ্চ বিদ্যালয় (দক্ষিণ বিভাগ)", ward_number: 9, village_name: "Bagula Station Para", sort_order: 10, is_active: true },
  { id: "booth-31", booth_number: 31, booth_name: "Muragacha Colony Primary School - Room 1", booth_name_bn: "মুড়াগাছা কলোনি প্রাথমিক বিদ্যালয় - কক্ষ ১", ward_number: 10, village_name: "Muragcha Colony", sort_order: 11, is_active: true },
  { id: "booth-32", booth_number: 32, booth_name: "Muragacha Colony Primary School - Room 2", booth_name_bn: "মুড়াগাছা কলোনি প্রাথমিক বিদ্যালয় - কক্ষ ২", ward_number: 10, village_name: "Muragcha Colony", sort_order: 12, is_active: true },
  { id: "booth-33", booth_number: 33, booth_name: "Bagula II Gram Panchayat Office Building", booth_name_bn: "বগুলা ২ নং গ্রাম পঞ্চায়েত কার্যালয় ভবন", ward_number: 11, village_name: "Baramuragacha", sort_order: 13, is_active: true },
  { id: "booth-34", booth_number: 34, booth_name: "Puratan Para Primary School", booth_name_bn: "পুরাতনপাড়া প্রাথমিক বিদ্যালয়", ward_number: 12, village_name: "Puratan Para", sort_order: 14, is_active: true },
  { id: "booth-35", booth_number: 35, booth_name: "Baramuragacha Milan Sangha Hall", booth_name_bn: "বড় মুড়াগাছা মিলন সংঘ হল", ward_number: 13, village_name: "Baramuragacha", sort_order: 15, is_active: true },
  { id: "booth-36", booth_number: 36, booth_name: "Bagula Station Para Boys School", booth_name_bn: "বগুলা স্টেশনপাড়া বালক বিদ্যালয়", ward_number: 14, village_name: "Bagula Station Para", sort_order: 16, is_active: true },
  { id: "booth-37", booth_number: 37, booth_name: "Bagula Madhya Para Primary School", booth_name_bn: "বগুলা মধ্যপাড়া প্রাথমিক বিদ্যালয়", ward_number: 15, village_name: "Bagula Madhya Para", sort_order: 17, is_active: true },
  { id: "booth-38", booth_number: 38, booth_name: "Bagula Puratan Para Junior High School", booth_name_bn: "বগুলা পুরাতনপাড়া জুনিয়র হাই স্কুল", ward_number: 16, village_name: "Bagula Puratan Para", sort_order: 18, is_active: true },
  { id: "booth-39", booth_number: 39, booth_name: "Sahapur Free Primary School - Room 1", booth_name_bn: "সাহাপুর অবৈতনিক প্রাথমিক বিদ্যালয় - কক্ষ ১", ward_number: 17, village_name: "Sahapur", sort_order: 19, is_active: true },
  { id: "booth-40", booth_number: 40, booth_name: "Sahapur Free Primary School - Room 2", booth_name_bn: "সাহাপুর অবৈতনিক প্রাথমিক বিদ্যালয় - কক্ষ ২", ward_number: 17, village_name: "Sahapur", sort_order: 20, is_active: true },
  { id: "booth-41", booth_number: 41, booth_name: "Sahapur Sishu Siksha Kendra", booth_name_bn: "সাহাপুর শিশু শিক্ষা কেন্দ্র", ward_number: 18, village_name: "Sahapur", sort_order: 21, is_active: true },
  { id: "booth-42", booth_number: 42, booth_name: "Bagula College Para South East Community Hall", booth_name_bn: "বগুলা কলেজপাড়া দক্ষিণ-পূর্ব কমিউনিটি হল", ward_number: 19, village_name: "Bagula College Para South East", sort_order: 22, is_active: true },
  { id: "booth-43", booth_number: 43, booth_name: "College Para Free Primary School", booth_name_bn: "কলেজপাড়া অবৈতনিক প্রাথমিক বিদ্যালয়", ward_number: 20, village_name: "College Para", sort_order: 23, is_active: true },
  { id: "booth-44", booth_number: 44, booth_name: "Bagula Madhya Para Anganwadi Centre", booth_name_bn: "বগুলা মধ্যপাড়া অঙ্গনওয়াড়ি কেন্দ্র", ward_number: 21, village_name: "Bagula Madhya Para", sort_order: 24, is_active: true },
  { id: "booth-45", booth_number: 45, booth_name: "Sahapur Junior High School", booth_name_bn: "সাহাপুর জুনিয়র হাই স্কুল", ward_number: 22, village_name: "Sahapur", sort_order: 25, is_active: true },
  { id: "booth-46", booth_number: 46, booth_name: "Bagula Station Para Girls High School", booth_name_bn: "বগুলা স্টেশনপাড়া বালিকা বিদ্যালয়", ward_number: 23, village_name: "Bagula Station Para", sort_order: 26, is_active: true },
  { id: "booth-47", booth_number: 47, booth_name: "Bagula College Para Sri Krishna College Campus", booth_name_bn: "বগুলা কলেজপাড়া শ্রীকৃষ্ণ কলেজ ক্যাম্পাস", ward_number: 24, village_name: "Bagula College Para", sort_order: 27, is_active: true },
  { id: "booth-48", booth_number: 48, booth_name: "Bagula Station Para Milan Tirtha", booth_name_bn: "বগুলা স্টেশনপাড়া মিলন তীর্থ", ward_number: 25, village_name: "Bagula Station Para", sort_order: 28, is_active: true },
  { id: "booth-49", booth_number: 49, booth_name: "Bagula College Para South Primary School", booth_name_bn: "বগুলা কলেজপাড়া দক্ষিণ প্রাথমিক বিদ্যালয়", ward_number: 26, village_name: "Bagaula College Para South", sort_order: 29, is_active: true },
  { id: "booth-50", booth_number: 50, booth_name: "Bagula College Para Community Hall", booth_name_bn: "বগুলা কলেজপাড়া কমিউনিটি হল", ward_number: 27, village_name: "Bagula College Para", sort_order: 30, is_active: true },
  { id: "booth-51", booth_number: 51, booth_name: "Madna Free Primary School", booth_name_bn: "মাদনা অবৈতনিক প্রাথমিক বিদ্যালয়", ward_number: 28, village_name: "Madna", sort_order: 31, is_active: true },
  { id: "booth-52", booth_number: 52, booth_name: "Hatibandha Primary School", booth_name_bn: "হাতিবান্ধা প্রাথমিক বিদ্যালয়", ward_number: 29, village_name: "Hatibandha", sort_order: 32, is_active: true },
  { id: "booth-53", booth_number: 53, booth_name: "Santinagar Free Primary School", booth_name_bn: "শান্তিনগর অবৈতনিক প্রাথমিক বিদ্যালয়", ward_number: 30, village_name: "Santinagar", sort_order: 33, is_active: true },
];

/**
 * Authoritative 30 Elected Ward/Sansad Members of Bagula II GP (PGE-2023).
 * Sourced directly from official Gram Panchayat Administrative Register.
 */
export const FALLBACK_WARD_MEMBERS: ElectedMember[] = [
  {
    id: "fallback-1",
    ward_number: 1,
    sansad_number: "I",
    name: "NANDINI BISWAS",
    name_bn: "নন্দিনী বিশ্বাস",
    designation: "Ward Member",
    village: "Milannagar Purba",
    address: "MILANNAGAR PURBA",
    part_no: "21",
    booth_number: 21,
    caste: "S.C",
    bank_name: "BANK OF INDIA 429410510000622",
    ifsc_code: "BKID0004294",
    contact: "7797943811",
    phone: "7797943811",
    aadhaar_no: "564708105344",
    pan_no: "CUFPB6664L",
    email: "nandinibiswas24011993@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 1,
    is_active: true,
    booth_id: "booth-21",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-2",
    ward_number: 2,
    sansad_number: "II",
    name: "KUSUM BAIRAGI",
    name_bn: "কুসুম বৈরাগী",
    designation: "Ward Member",
    village: "Milannagar East",
    address: "MILANNAGAR EAST",
    part_no: "22",
    booth_number: 22,
    caste: "S.C",
    bank_name: "BGVB 5031020010092",
    ifsc_code: "PUNB0RRBBGB",
    contact: "9093730989",
    phone: "9093730989",
    aadhaar_no: "981451011818",
    pan_no: "GVFPB8848P",
    email: "mrinmaybairagi405@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 2,
    is_active: true,
    booth_id: "booth-22",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-3",
    ward_number: 3,
    sansad_number: "III",
    name: "ITI BISWAS SANNYASI",
    name_bn: "ইতি বিশ্বাস সন্ন্যাসী",
    designation: "Ward Member",
    village: "Milannagar",
    address: "MILANNAGAR",
    part_no: "23",
    booth_number: 23,
    caste: "S.C",
    bank_name: "BGVB 5031010010356",
    ifsc_code: "PUNB0RRBBGB",
    contact: "8927063297",
    phone: "8927063297",
    aadhaar_no: "913837156486",
    pan_no: "GNYPS2364N",
    email: "subendukumarbiswas@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 3,
    is_active: true,
    booth_id: "booth-23",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-4",
    ward_number: 4,
    sansad_number: "IV",
    name: "SUPRIYA BISWAS",
    name_bn: "সুপ্রিয়া বিশ্বাস",
    designation: "Ward Member",
    village: "Milannagar Paschim",
    address: "MILANNAGAR PASCHIM",
    part_no: "24",
    booth_number: 24,
    caste: "S.C",
    bank_name: "SBI 41054616181",
    ifsc_code: "SBIN0001302",
    contact: "9064306830",
    phone: "9064306830",
    aadhaar_no: "742250892636",
    pan_no: "HHEPM6611K",
    email: "supriyabiseas6@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 4,
    is_active: true,
    booth_id: "booth-24",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-5",
    ward_number: 5,
    sansad_number: "V",
    name: "UJJAL BISWAS",
    name_bn: "উজ্জ্বল বিশ্বাস",
    designation: "Ward Member",
    village: "Baramuragacha",
    address: "BARAMURAGACHA",
    part_no: "25",
    booth_number: 25,
    caste: "S.C",
    bank_name: "SBI 35621405072",
    ifsc_code: "SBIN0001302",
    contact: "8927090253",
    phone: "8927090253",
    aadhaar_no: "558708523812",
    pan_no: "BVPPB0263H",
    email: "bujjal048@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 5,
    is_active: true,
    booth_id: "booth-25",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-6",
    ward_number: 6,
    sansad_number: "VI",
    name: "SABITA BISWAS DAS",
    name_bn: "সবিতা বিশ্বাস দাস",
    designation: "Ward Member",
    village: "Milannagar Paschim",
    address: "MILANNAGAR PASCHIM",
    part_no: "26",
    booth_number: 26,
    caste: "S.C",
    bank_name: "BGVB 5031010002375",
    ifsc_code: "PUNB0RRBBGB",
    contact: "7407247731",
    phone: "7407247731",
    aadhaar_no: "567840579359",
    pan_no: "AOMPD2929M",
    email: "tapansabita007@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 6,
    is_active: true,
    booth_id: "booth-26",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-7",
    ward_number: 7,
    sansad_number: "VII",
    name: "NIBADITA DUTTA ROY",
    name_bn: "নিবেদিতা দত্ত রায়",
    designation: "Ward Member",
    village: "Bagula Station Para",
    address: "BAGULA STATION PARA",
    part_no: "27",
    booth_number: 27,
    caste: "S.C",
    bank_name: "BANK OF BARODA 19840100016614",
    ifsc_code: "BARB0MAYNAD",
    contact: "6294198713",
    phone: "6294198713",
    aadhaar_no: "567760871274",
    pan_no: "BVGPR9555P",
    email: "nibaditadutta45@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 7,
    is_active: true,
    booth_id: "booth-27",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-8",
    ward_number: 8,
    sansad_number: "VIII",
    name: "AKHIL KUMAR BISWAS",
    name_bn: "অখিল কুমার বিশ্বাস",
    designation: "Ward Member",
    village: "Station Para",
    address: "STATION PARA",
    part_no: "28",
    booth_number: 28,
    caste: "S.C",
    bank_name: "SBI 11262256725",
    ifsc_code: "SBIN0001302",
    contact: "8158993455",
    phone: "8158993455",
    aadhaar_no: "201156861435",
    pan_no: "CUSPB3713M",
    email: "biswasakhil277@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 8,
    is_active: true,
    booth_id: "booth-28",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-9",
    ward_number: 9,
    sansad_number: "IX",
    name: "SIMA TIKADAR",
    name_bn: "সীমা টিকাদার",
    designation: "Ward Member",
    village: "Bagula Station Para",
    address: "BAGULA STATION PARA",
    part_no: "29, 30",
    booth_number: 29,
    booth_numbers: "29, 30",
    caste: "S.C",
    bank_name: "BGVB 031010045702",
    ifsc_code: "PUNB0RRBBGB",
    contact: "9933134367",
    phone: "9933134367",
    aadhaar_no: "332671202409",
    pan_no: "CCKPT2359D",
    email: "simatikader836@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 9,
    is_active: true,
    booth_id: "booth-29",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-10",
    ward_number: 10,
    sansad_number: "X",
    name: "KOUSHALLYA MRIDHA",
    name_bn: "কৌশল্যা মৃধা",
    designation: "Ward Member",
    village: "Muragcha Colony",
    address: "MURAGCHA COLONY",
    part_no: "31, 32",
    booth_number: 31,
    booth_numbers: "31, 32",
    caste: "S.C",
    bank_name: "SBI 11262287266",
    ifsc_code: "SBIN0001302",
    contact: "8116399917",
    phone: "8116399917",
    aadhaar_no: "746369052636",
    pan_no: "AXEPM3458P",
    email: "koushallya1965@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 10,
    is_active: true,
    booth_id: "booth-31",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-11",
    ward_number: 11,
    sansad_number: "XI",
    name: "SUSMITA BISWAS BARMAN",
    name_bn: "সুস্মিতা বিশ্বাস বর্মন",
    designation: "Prodhan",
    village: "Baramuragacha",
    address: "BARAMURAGACHA",
    part_no: "33",
    booth_number: 33,
    caste: "S.C",
    bank_name: "SBI 34399011970",
    ifsc_code: "SBIN0001302",
    contact: "6296108978",
    phone: "6296108978",
    aadhaar_no: "312039957684",
    pan_no: "EYZPB9639F",
    email: "susmitabarman691994@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 11,
    is_active: true,
    booth_id: "booth-33",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-12",
    ward_number: 12,
    sansad_number: "XII",
    name: "BANDANA BARMAN",
    name_bn: "বন্দনা বর্মন",
    designation: "Ward Member",
    village: "Puratan Para",
    address: "PURATAN PARA",
    part_no: "34",
    booth_number: 34,
    caste: "S.C",
    bank_name: "SBI 30685791384",
    ifsc_code: "SBIN0001302",
    contact: "9775820375",
    phone: "9775820375",
    aadhaar_no: "224228462218",
    pan_no: "BLEPB9585R",
    email: "subratobarman979@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 12,
    is_active: true,
    booth_id: "booth-34",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-13",
    ward_number: 13,
    sansad_number: "XIII",
    name: "GOBINDA GHOSH",
    name_bn: "গোবিন্দ ঘোষ",
    designation: "Ward Member",
    village: "Baramuragacha",
    address: "BARAMURAGACHA",
    part_no: "35",
    booth_number: 35,
    caste: "GEN",
    bank_name: "SBI 33286797887",
    ifsc_code: "SBIN0001302",
    contact: "7501237108",
    phone: "7501237108",
    aadhaar_no: "907037593253",
    pan_no: "BLBPG8559H",
    email: "ggobindaghosh289@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 13,
    is_active: true,
    booth_id: "booth-35",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-14",
    ward_number: 14,
    sansad_number: "XIV",
    name: "GAUTAM BISWAS",
    name_bn: "গৌতম বিশ্বাস",
    designation: "Ward Member",
    village: "Bagula Station Para",
    address: "BAGULA STATION PARA",
    part_no: "36",
    booth_number: 36,
    caste: "S.C",
    bank_name: "BANDHAN BANK 50200002836346",
    ifsc_code: "BOBL0001052",
    contact: "9339032828",
    phone: "9339032828",
    aadhaar_no: "283673276467",
    pan_no: "DCWPB1614N",
    email: "gb940468@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 14,
    is_active: true,
    booth_id: "booth-36",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-15",
    ward_number: 15,
    sansad_number: "XV",
    name: "TANUSHREE BISWAS",
    name_bn: "তনুশ্রী বিশ্বাস",
    designation: "Ward Member",
    village: "Bagula Madhya Para",
    address: "BAGULA MADHYA PARA",
    part_no: "37",
    booth_number: 37,
    caste: "GEN",
    bank_name: "INDIAN BANK 50150433643",
    ifsc_code: "IDIB000B543",
    contact: "8250412242",
    phone: "8250412242",
    aadhaar_no: "961152243414",
    pan_no: "BXXPB3736K",
    email: "sagar.bagula@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 15,
    is_active: true,
    booth_id: "booth-37",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-16",
    ward_number: 16,
    sansad_number: "XVI",
    name: "RABINDRA NATH GHOSH",
    name_bn: "রবীন্দ্র নাথ ঘোষ",
    designation: "Ward Member",
    village: "Bagula Puratan Para",
    address: "BAGULA PURATAN PARA",
    part_no: "38",
    booth_number: 38,
    caste: "GEN",
    bank_name: "SBI 11262216748",
    ifsc_code: "SBIN0001302",
    contact: "9475274545",
    phone: "9475274545",
    aadhaar_no: "546267279971",
    pan_no: "AMEPG7079D",
    email: "rabindranathbagula@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 16,
    is_active: true,
    booth_id: "booth-38",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-17",
    ward_number: 17,
    sansad_number: "XVII",
    name: "ITI MAJUMDER",
    name_bn: "ইতি মজুমদার",
    designation: "Ward Member",
    village: "Sahapur",
    address: "SAHAPUR",
    part_no: "39, 40",
    booth_number: 39,
    booth_numbers: "39, 40",
    caste: "S.C",
    bank_name: "BANK OF INDIA 429410110014984",
    ifsc_code: "BKID0004294",
    contact: "6295742619",
    phone: "6295742619",
    aadhaar_no: "340143464004",
    pan_no: "IONPM5529H",
    email: "sayan12345.sm@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 17,
    is_active: true,
    booth_id: "booth-39",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-18",
    ward_number: 18,
    sansad_number: "XVIII",
    name: "SUKHEN MONDAL",
    name_bn: "সুখেন মণ্ডল",
    designation: "Ward Member",
    village: "Sahapur",
    address: "SAHAPUR",
    part_no: "41",
    booth_number: 41,
    caste: "S.C",
    bank_name: "PNB 1993010094142",
    ifsc_code: "PUNB0199320",
    contact: "9883945813",
    phone: "9883945813",
    aadhaar_no: "764711153641",
    pan_no: "FORPM7530F",
    email: "mondalsuku1@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 18,
    is_active: true,
    booth_id: "booth-41",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-19",
    ward_number: 19,
    sansad_number: "XIX",
    name: "CHANI BISWAS",
    name_bn: "চানি বিশ্বাস",
    designation: "Ward Member",
    village: "Bagula College Para South East",
    address: "BAGULA COLLEGE PARA SOUTH EAST",
    part_no: "42",
    booth_number: 42,
    caste: "S.C",
    bank_name: "BANK OF INDIA 429410110018520",
    ifsc_code: "BKID0004294",
    contact: "7365864474",
    phone: "7365864474",
    aadhaar_no: "452430210797",
    pan_no: "BBAPB8286R",
    email: "chanibiswas81@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 19,
    is_active: true,
    booth_id: "booth-42",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-20",
    ward_number: 20,
    sansad_number: "XX",
    name: "RANI DUTTA",
    name_bn: "রাণী দত্ত",
    designation: "Ward Member",
    village: "College Para",
    address: "COLLEGE PARA",
    part_no: "43",
    booth_number: 43,
    caste: "GEN",
    bank_name: "BANK OF BORODA 19840100009878",
    ifsc_code: "BARB0MAYNAD",
    contact: "7908373473",
    phone: "7908373473",
    aadhaar_no: "316954867937",
    pan_no: "BUUPD2546R",
    email: "ranidutta888@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 20,
    is_active: true,
    booth_id: "booth-43",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-21",
    ward_number: 21,
    sansad_number: "XXI",
    name: "SOMA BISWAS",
    name_bn: "সোমা বিশ্বাস",
    designation: "Ward Member",
    village: "Bagula Madhya Para",
    address: "BAGULA MADHYA PARA",
    part_no: "44",
    booth_number: 44,
    caste: "S.C",
    bank_name: "INDIAN BANK 50174735569",
    ifsc_code: "IDIB000B543",
    contact: "7003801782",
    phone: "7003801782",
    aadhaar_no: "983462022676",
    pan_no: "DIRPB0339B",
    email: "biswassoma907@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 21,
    is_active: true,
    booth_id: "booth-44",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-22",
    ward_number: 22,
    sansad_number: "XXII",
    name: "RAKESH BISWAS",
    name_bn: "রাকেশ বিশ্বাস",
    designation: "Ward Member",
    village: "Sahapur",
    address: "SAHAPUR",
    part_no: "45",
    booth_number: 45,
    caste: "S.C",
    bank_name: "BANDHAN BANK 50210016990170",
    ifsc_code: "BOBL0001052",
    contact: "9749653509",
    phone: "9749653509",
    aadhaar_no: "612871458247",
    pan_no: "BRUPB3474R",
    email: "rbiswas01011985@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 22,
    is_active: true,
    booth_id: "booth-45",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-23",
    ward_number: 23,
    sansad_number: "XXIII",
    name: "KANAK BISWAS",
    name_bn: "কনক বিশ্বাস",
    designation: "Ward Member",
    village: "Bagula Station Para",
    address: "BAGULA STATION PARA",
    part_no: "46",
    booth_number: 46,
    caste: "S.C",
    bank_name: "SBI 34711384055",
    ifsc_code: "SBIN0001302",
    contact: "9002823400",
    phone: "9002823400",
    aadhaar_no: "685241731428",
    pan_no: "AHOPB2484N",
    email: "kanakbg17@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 23,
    is_active: true,
    booth_id: "booth-46",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-24",
    ward_number: 24,
    sansad_number: "XXIV",
    name: "SUJOY BISWAS",
    name_bn: "সুজয় বিশ্বাস",
    designation: "Ward Member",
    village: "Bagula College Para",
    address: "BAGULA COLLEGE PARA",
    part_no: "47",
    booth_number: 47,
    caste: "S.C",
    bank_name: "BANK OF INDIA 429410110003550",
    ifsc_code: "BKID0004294",
    contact: "7047610861",
    phone: "7047610861",
    aadhaar_no: "834813709020",
    pan_no: "CCDPB9962P",
    email: "sujaybiswas3689@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 24,
    is_active: true,
    booth_id: "booth-47",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-25",
    ward_number: 25,
    sansad_number: "XXV",
    name: "CHAMPA SIKDER",
    name_bn: "চম্পা শিকদার",
    designation: "Ward Member",
    village: "Bagula Station Para",
    address: "BAGULA STATION PARA",
    part_no: "48",
    booth_number: 48,
    caste: "S.C",
    bank_name: "SBI 31893810111",
    ifsc_code: "SBIN0001302",
    contact: "8116457950",
    phone: "8116457950",
    aadhaar_no: "644696426513",
    pan_no: "JAWPS2360L",
    email: "champasikdar270@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 25,
    is_active: true,
    booth_id: "booth-48",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-26",
    ward_number: 26,
    sansad_number: "XXVI",
    name: "SWAPAN KUMAR SARKAR",
    name_bn: "স্বপন কুমার সরকার",
    designation: "Ward Member",
    village: "Bagaula College Para South",
    address: "BAGAULA COLLEGE PARA SOUTH",
    part_no: "49",
    booth_number: 49,
    caste: "S.C",
    bank_name: "SBI 11262252233",
    ifsc_code: "SBIN0001302",
    contact: "8317892156",
    phone: "8317892156",
    aadhaar_no: "285601448164",
    pan_no: "BPBPS4833N",
    email: "shyamal.sarkar222@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 26,
    is_active: true,
    booth_id: "booth-49",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-27",
    ward_number: 27,
    sansad_number: "XXVII",
    name: "APARNA PODDAR",
    name_bn: "অপর্ণা পোদ্দার",
    designation: "Ward Member",
    village: "Bagula College Para",
    address: "BAGULA COLLEGE PARA",
    part_no: "50",
    booth_number: 50,
    caste: "S.C",
    bank_name: "BGVB 5031010030436",
    ifsc_code: "PUNB0RRBBGB",
    contact: "9932285723",
    phone: "9932285723",
    aadhaar_no: "956926927864",
    pan_no: "DDJPP3220E",
    email: "podderaparna46@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 27,
    is_active: true,
    booth_id: "booth-50",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-28",
    ward_number: 28,
    sansad_number: "XXVIII",
    name: "SHARAT MINJI",
    name_bn: "শরৎ মিঞ্জি",
    designation: "Ward Member",
    village: "Madna",
    address: "MADNA",
    part_no: "51",
    booth_number: 51,
    caste: "S.T",
    bank_name: "SBI 35920395538",
    ifsc_code: "SBIN0001302",
    contact: "9735356490",
    phone: "9735356490",
    aadhaar_no: "783445541543",
    pan_no: "DDBPM2467J",
    email: "bujjal048@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 28,
    is_active: true,
    booth_id: "booth-51",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-29",
    ward_number: 29,
    sansad_number: "XXIX",
    name: "FIROJ MANDAL",
    name_bn: "ফিরোজ মণ্ডল",
    designation: "Ward Member",
    village: "Hatibandha",
    address: "HATIBANDHA",
    part_no: "52",
    booth_number: 52,
    caste: "GEN",
    bank_name: "SBI 32341923445",
    ifsc_code: "SBIN0001302",
    contact: "9679370096 / 8116594476",
    phone: "9679370096",
    aadhaar_no: "358648032535",
    pan_no: "BNOPM8305C",
    email: "fm934884@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 29,
    is_active: true,
    booth_id: "booth-52",
    party_id: null,
    photo_url: null,
  },
  {
    id: "fallback-30",
    ward_number: 30,
    sansad_number: "XXX",
    name: "MANORANJAN BHOWMICK",
    name_bn: "মনোরঞ্জন ভৌমিক",
    designation: "Upa-Prodhan",
    village: "Santinagar",
    address: "SANTINAGAR",
    part_no: "53",
    booth_number: 53,
    caste: "OBC",
    bank_name: "SBI 30829805900",
    ifsc_code: "SBIN0001302",
    contact: "7001637973",
    phone: "7001637973",
    aadhaar_no: "410299063310",
    pan_no: "ALNPB9589P",
    email: "manoranjanbhawmick@gmail.com",
    party_name: "All India Trinamool Congress",
    party_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    display_order: 30,
    is_active: true,
    booth_id: "booth-53",
    party_id: null,
    photo_url: null,
  },
];

/**
 * Associated Representatives / Panchayat Samiti Members representing Bagula II GP area.
 */
export const ASSOCIATED_REPRESENTATIVES: Array<{
  id: string;
  sl_no: number;
  name: string;
  name_bn: string;
  address: string;
  contact?: string | null;
  designation: string;
}> = [
  {
    id: "assoc-31",
    sl_no: 31,
    name: "NABIN GHOSH",
    name_bn: "নবীন ঘোষ",
    address: "SAHAPUR",
    contact: "8918950421",
    designation: "Panchayat Samiti Member / Representative",
  },
  {
    id: "assoc-32",
    sl_no: 32,
    name: "ANJALI BISWAS",
    name_bn: "অঞ্জলি বিশ্বাস",
    address: "MURAGCHA COLONY",
    contact: null,
    designation: "Panchayat Samiti Member / Representative",
  },
  {
    id: "assoc-33",
    sl_no: 33,
    name: "ANANDA KABIRAJ",
    name_bn: "আনন্দ কবিরাজ",
    address: "STATION PARA",
    contact: null,
    designation: "Panchayat Samiti Member / Representative",
  },
];

/**
 * Hook to load active elected members for public citizen display.
 */
export function useElectedMembers() {
  const [members, setMembers] = useState<ElectedMember[]>(FALLBACK_WARD_MEMBERS);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("elected_members" as never)
        .select(`
          *,
          master_parties ( party_code, party_name, party_logo_url ),
          master_booths ( booth_number, booth_name )
        `)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("ward_number", { ascending: true });

      if (error || !data || (data as any[]).length === 0) {
        setMembers(FALLBACK_WARD_MEMBERS);
      } else {
        const mapped = (data as any[]).map((r) => ({
          ...r,
          party_name: r.master_parties?.party_name ?? r.party_name,
          party_logo_url: r.master_parties?.party_logo_url ?? r.party_logo_url,
          party_code: r.master_parties?.party_code ?? null,
          booth_name: r.master_booths?.booth_name ?? null,
          booth_number: r.master_booths?.booth_number ?? r.booth_number,
        }));
        setMembers(mapped);
      }
    } catch {
      setMembers(FALLBACK_WARD_MEMBERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, refresh: fetchMembers };
}

/**
 * Hook to load all elected members for Super Admin management (active + inactive).
 */
export function useAllElectedMembersAdmin() {
  const [members, setMembers] = useState<ElectedMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const localOverrides = getLocalPartyOverrides();

      const { data, error } = await supabase
        .from("elected_members" as never)
        .select(`
          *,
          master_parties ( party_code, party_name, party_logo_url, color_code ),
          master_booths ( booth_number, booth_name )
        `)
        .order("ward_number", { ascending: true });

      const baseList: ElectedMember[] = (error || !data || (data as any[]).length === 0)
        ? FALLBACK_WARD_MEMBERS
        : (data as any[]).map((r) => ({
            ...r,
            party_name: r.master_parties?.party_name ?? r.party_name,
            party_logo_url: r.master_parties?.party_logo_url ?? r.party_logo_url,
            party_code: r.master_parties?.party_code ?? null,
            color_code: r.master_parties?.color_code ?? null,
            booth_name: r.master_booths?.booth_name ?? null,
            booth_number: r.master_booths?.booth_number ?? r.booth_number,
          }));

      // Apply any local overrides & compute party theme
      const merged = baseList.map((m) => {
        const overrideCode = localOverrides[m.ward_number];
        const effectiveParty = overrideCode || m.party_code || m.party_name;
        const theme = getPartyColorConfig(effectiveParty);
        return {
          ...m,
          party_code: overrideCode ? theme.code : (m.party_code || theme.code),
          party_name: overrideCode ? theme.fullName : (m.party_name || theme.fullName),
          party_logo_url: overrideCode ? theme.logoUrl : (m.party_logo_url || theme.logoUrl),
          color_code: theme.hex,
          party_theme: theme,
        };
      });

      setMembers(merged);
    } catch {
      const localOverrides = getLocalPartyOverrides();
      const merged = FALLBACK_WARD_MEMBERS.map((m) => {
        const overrideCode = localOverrides[m.ward_number];
        const theme = getPartyColorConfig(overrideCode || m.party_name);
        return {
          ...m,
          party_code: overrideCode ? theme.code : (m.party_code || theme.code),
          party_name: overrideCode ? theme.fullName : (m.party_name || theme.fullName),
          party_logo_url: overrideCode ? theme.logoUrl : (m.party_logo_url || theme.logoUrl),
          color_code: theme.hex,
          party_theme: theme,
        };
      });
      setMembers(merged);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    const handleCustomUpdate = () => {
      fetchAll();
    };
    window.addEventListener("member-party-updated", handleCustomUpdate);
    return () => {
      window.removeEventListener("member-party-updated", handleCustomUpdate);
    };
  }, [fetchAll]);

  return { members, loading, refresh: fetchAll };
}

/**
 * Super Admin Action: Rapidly update the political party of an elected member.
 * Enforces authoritative party colors:
 * - BJP = Saffron (#ea580c)
 * - TMC = Green (#16a34a)
 * - CONG. = Blue (#2563eb)
 * - CPIM = Red (#dc2626)
 * - IND = Slate (#475569)
 */
export async function updateElectedMemberParty(
  memberId: string | null,
  wardNumber: number,
  partyCode: string
): Promise<{ success: boolean; error?: string; theme?: PartyColorTheme }> {
  try {
    const theme = getPartyColorConfig(partyCode);
    // Instant local override so UI reflects change in 0ms
    saveLocalPartyOverride(wardNumber, theme.code);

    // Call dedicated Super Admin RPC if available
    const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)("change_elected_member_party", {
      _member_id: memberId && !memberId.startsWith("fallback") ? memberId : null,
      _ward_number: wardNumber,
      _party_code: theme.code,
    });

    if (!rpcErr) {
      return { success: true, theme };
    }

    // Fallback: direct update on table
    const { data: partyRow } = await supabase
      .from("master_parties" as never)
      .select("id, party_name, party_logo_url")
      .eq("party_code", theme.code)
      .maybeSingle();

    const updatePayload: Record<string, any> = {
      party_name: (partyRow as any)?.party_name || theme.fullName,
      party_logo_url: (partyRow as any)?.party_logo_url || theme.logoUrl,
      updated_at: new Date().toISOString(),
    };
    if ((partyRow as any)?.id) {
      updatePayload.party_id = (partyRow as any).id;
    }

    let query = supabase.from("elected_members" as never).update(updatePayload as never);
    if (memberId && !memberId.startsWith("fallback")) {
      query = query.eq("id", memberId);
    } else {
      query = query.eq("ward_number", wardNumber);
    }
    await query;

    return { success: true, theme };
  } catch (err: any) {
    console.warn("Party update sync note:", err.message);
    return { success: true, theme: getPartyColorConfig(partyCode) };
  }
}

/**
 * Hook to load live elected representatives (30 wards) for public and citizen directory views.
 * Merges authoritative baseline records with real-time party changes & color themes.
 */
export function useElectedRepresentativesLive() {
  const [representatives, setRepresentatives] = useState<ElectedRepresentativeRecord[]>(() => {
    const localOverrides = getLocalPartyOverrides();
    return ELECTED_REPRESENTATIVES_DATA.map((rep) => {
      const overrideCode = localOverrides[rep.wardNumber];
      if (overrideCode) {
        const theme = getPartyColorConfig(overrideCode);
        return {
          ...rep,
          partyName: theme.fullName,
          partyLogoUrl: theme.logoUrl || rep.partyLogoUrl,
        };
      }
      return rep;
    });
  });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const localOverrides = getLocalPartyOverrides();
      const { data } = await supabase
        .from("elected_members" as never)
        .select(`
          ward_number,
          party_name,
          party_logo_url,
          photo_url,
          designation,
          name,
          name_bn,
          master_parties ( party_code, party_name, party_logo_url, color_code )
        `);

      const dbMap = new Map<number, any>();
      if (data && Array.isArray(data)) {
        data.forEach((row: any) => {
          if (row.ward_number) dbMap.set(row.ward_number, row);
        });
      }

      const merged = ELECTED_REPRESENTATIVES_DATA.map((rep) => {
        const dbRow = dbMap.get(rep.wardNumber);
        const overrideCode = localOverrides[rep.wardNumber];

        const effectiveParty = overrideCode || dbRow?.master_parties?.party_code || dbRow?.party_name || rep.partyName;
        const theme = getPartyColorConfig(effectiveParty);

        return {
          ...rep,
          name: dbRow?.name || rep.name,
          nameBn: dbRow?.name_bn || rep.nameBn,
          designation: dbRow?.designation || rep.designation,
          photoUrl: dbRow?.photo_url || rep.photoUrl,
          partyName: theme.fullName,
          partyLogoUrl: theme.logoUrl || dbRow?.party_logo_url || rep.partyLogoUrl,
        };
      });

      setRepresentatives(merged);
    } catch {
      const localOverrides = getLocalPartyOverrides();
      const merged = ELECTED_REPRESENTATIVES_DATA.map((rep) => {
        const overrideCode = localOverrides[rep.wardNumber];
        if (overrideCode) {
          const theme = getPartyColorConfig(overrideCode);
          return {
            ...rep,
            partyName: theme.fullName,
            partyLogoUrl: theme.logoUrl || rep.partyLogoUrl,
          };
        }
        return rep;
      });
      setRepresentatives(merged);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener("member-party-updated", handleUpdate);
    return () => {
      window.removeEventListener("member-party-updated", handleUpdate);
    };
  }, [loadData]);

  return { representatives, loading, refresh: loadData };
}

/**
 * Hook to load political parties.
 */
export function useMasterParties() {
  const [parties, setParties] = useState<MasterParty[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParties = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("master_parties" as never)
        .select("*")
        .order("sort_order", { ascending: true });
      if (!error && data) {
        setParties(data as unknown as MasterParty[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  return { parties, loading, refresh: fetchParties };
}

/**
 * Hook to load polling booths, optionally restricted strictly to a selected ward number.
 * Enforces: District -> Block -> Gram Panchayat -> Ward -> Booth -> Member.
 */
export function useMasterBooths(wardNumber?: number) {
  const [booths, setBooths] = useState<MasterBooth[]>(() => {
    if (wardNumber !== undefined && wardNumber !== null && wardNumber > 0) {
      return FALLBACK_BOOTHS.filter((b) => b.ward_number === wardNumber);
    }
    return FALLBACK_BOOTHS;
  });
  const [loading, setLoading] = useState(true);

  const fetchBooths = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("master_booths" as never)
        .select("*")
        .order("booth_number", { ascending: true });

      if (wardNumber !== undefined && wardNumber !== null && wardNumber > 0) {
        q = q.eq("ward_number", wardNumber);
      }

      const { data, error } = await q;
      if (!error && data && (data as unknown as MasterBooth[]).length > 0) {
        setBooths(data as unknown as MasterBooth[]);
      } else {
        // Fallback to official 33 polling booths (Parts 21 to 53)
        if (wardNumber !== undefined && wardNumber !== null && wardNumber > 0) {
          setBooths(FALLBACK_BOOTHS.filter((b) => b.ward_number === wardNumber));
        } else {
          setBooths(FALLBACK_BOOTHS);
        }
      }
    } catch {
      if (wardNumber !== undefined && wardNumber !== null && wardNumber > 0) {
        setBooths(FALLBACK_BOOTHS.filter((b) => b.ward_number === wardNumber));
      } else {
        setBooths(FALLBACK_BOOTHS);
      }
    } finally {
      setLoading(false);
    }
  }, [wardNumber]);

  useEffect(() => {
    fetchBooths();
  }, [fetchBooths]);

  return { booths, loading, refresh: fetchBooths };
}

/**
 * Saves or updates an Elected Member via RPC or upsert.
 */
export async function saveElectedMember(memberId: string | null, payload: Partial<ElectedMember>) {
  try {
    if (payload.ward_number && (payload.party_name || payload.party_code)) {
      const theme = getPartyColorConfig(payload.party_code || payload.party_name);
      saveLocalPartyOverride(payload.ward_number, theme.code);
    }

    const { data, error } = await (supabase.rpc as any)("save_elected_member", {
      _member_id: memberId && !memberId.startsWith("fallback") ? memberId : null,
      _payload: payload,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save member" };
  }
}

/**
 * Hook to load attachments for any configurable parent entity.
 */
export function useAttachments(parentEntity: string, parentId: string) {
  const [attachments, setAttachments] = useState<AppAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttachments = useCallback(async () => {
    if (!parentId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_attachments" as never)
        .select("*")
        .eq("parent_entity", parentEntity)
        .eq("parent_id", parentId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAttachments(data as unknown as AppAttachment[]);
      }
    } finally {
      setLoading(false);
    }
  }, [parentEntity, parentId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  return { attachments, loading, refresh: fetchAttachments };
}

// Re-export dedicated ElectedRepresentativesData constants and services
export * from "./electedRepresentativesData";
export * from "./partyColorConfig";
