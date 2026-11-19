export interface Passage {
  id: string;
  document: string;
  section: string;
  authority: string;
  url: string;
  keywords: string[];
  needsVerification: boolean;
  text: string;
}

export const KNOWLEDGE_BASE: Passage[] = [
  {
    "id": "cpa2019-sec2-10",
    "document": "Consumer Protection Act, 2019",
    "section": "Section 2(10)",
    "authority": "Ministry of Law and Justice",
    "url": "https://www.indiacode.nic.in/handle/123456789/15256",
    "keywords": ["defect", "quality", "quantity", "fault", "goods", "imperfection"],
    "needsVerification": false,
    "text": "Section 2(10): 'defect' means any fault, imperfection or shortcoming in the quality, quantity, potency, purity or standard which is required to be maintained by or under any law for the time being in force or under any contract, express or implied or as is claimed by the trader in any manner whatsoever in relation to any goods."
  },
  {
    "id": "cpa2019-sec2-11",
    "document": "Consumer Protection Act, 2019",
    "section": "Section 2(11)",
    "authority": "Ministry of Law and Justice",
    "url": "https://www.indiacode.nic.in/handle/123456789/15256",
    "keywords": ["deficiency", "service", "shortcoming", "inadequacy", "fault", "negligence", "withholding"],
    "needsVerification": false,
    "text": "Section 2(11): 'deficiency' means any fault, imperfection, shortcoming or inadequacy in the quality, nature and manner of performance which is required to be maintained by or under any law for the time being in force or has been undertaken to be performed by a person in pursuance of a contract or otherwise in relation to any service and includes— (i) any act of negligence or omission or commission by such person which causes loss or injury to the consumer; and (ii) deliberate withholding of relevant information by such person to the consumer."
  },
  {
    "id": "cpa2019-sec2-28",
    "document": "Consumer Protection Act, 2019",
    "section": "Section 2(28)",
    "authority": "Ministry of Law and Justice",
    "url": "https://www.indiacode.nic.in/handle/123456789/15256",
    "keywords": ["misleading advertisement", "false description", "guarantee", "deception", "unfair trade practice"],
    "needsVerification": false,
    "text": "Section 2(28): 'misleading advertisement' in relation to any product or service, means an advertisement, which— (i) falsely describes such product or service; or (ii) gives a false guarantee to, or is likely to mislead the consumers as to the nature, substance, quantity or quality of such product or service; or (iii) conveys an express or implied representation which, if made by the manufacturer or seller or service provider thereof, would constitute an unfair trade practice; or (iv) deliberately conceals important information."
  },
  {
    "id": "cpa2019-sec2-47",
    "document": "Consumer Protection Act, 2019",
    "section": "Section 2(47)",
    "authority": "Ministry of Law and Justice",
    "url": "https://www.indiacode.nic.in/handle/123456789/15256",
    "keywords": ["unfair trade practice", "refusal to refund", "withdrawing defective goods", "cancellation", "false representation"],
    "needsVerification": false,
    "text": "Section 2(47): 'unfair trade practice' means a trade practice which, for the purpose of promoting the sale, use or supply of any goods or for the provision of any service, adopts any unfair method or unfair or deceptive practice including refusing, after selling goods or providing services, to take back or withdraw defective goods or to discontinue deficient services and refund the consideration paid therefor within the period stipulated in the bill or cash memorandum or within a period of thirty days if no such period is stipulated."
  },
  {
    "id": "cpa2019-sec84-prod-liability",
    "document": "Consumer Protection Act, 2019",
    "section": "Section 84",
    "authority": "Ministry of Law and Justice",
    "url": "https://www.indiacode.nic.in/handle/123456789/15256",
    "keywords": ["product liability", "manufacturer liability", "manufacturing defect", "design defect", "express warranty", "harm"],
    "needsVerification": false,
    "text": "Section 84: Liability of product manufacturer: (1) A product manufacturer shall be liable in a product liability action, if— (a) the product contains a manufacturing defect; or (b) the product is defective in design; or (c) there is a deviation from manufacturing specifications; or (d) the product does not conform to the express warranty; or (e) the product fails to contain adequate instructions of correct usage to prevent any harm or any warning regarding improper or incorrect usage."
  },
  {
    "id": "cpa2019-sec85-service-liability",
    "document": "Consumer Protection Act, 2019",
    "section": "Section 85",
    "authority": "Ministry of Law and Justice",
    "url": "https://www.indiacode.nic.in/handle/123456789/15256",
    "keywords": ["product service provider", "service liability", "inadequate service", "contractual failure"],
    "needsVerification": false,
    "text": "Section 85: Liability of product service provider: A product service provider shall be liable in a product liability action, if— (a) the service provided by him was faulty or imperfect or deficient or inadequate in quality, nature or manner of performance; or (b) there was an act of omission or commission or negligence or conscious withholding of any information which caused harm; or (c) the service provider did not issue adequate instructions or warnings; or (d) the service did not conform to express warranty or the terms and conditions of the contract."
  },
  {
    "id": "cpa2019-sec86-seller-liability",
    "document": "Consumer Protection Act, 2019",
    "section": "Section 86",
    "authority": "Ministry of Law and Justice",
    "url": "https://www.indiacode.nic.in/handle/123456789/15256",
    "keywords": ["product seller liability", "substantial control", "modification", "alteration", "independent express warranty"],
    "needsVerification": false,
    "text": "Section 86: Liability of product seller: A product seller who is not a product manufacturer shall be liable in a product liability action, if— (a) he has exercised substantial control over the designing, testing, manufacturing, packaging or labelling of a product; or (b) he has altered or modified the product and such alteration was a substantial factor in causing the harm; or (c) he has made an independent express warranty not conforming to the manufacturer's warranty; or (d) the manufacturer is not subject to the law or cannot be identified."
  },
  {
    "id": "cpa2019-sec21-ccpa-penalties",
    "document": "Consumer Protection Act, 2019",
    "section": "Section 21",
    "authority": "Ministry of Law and Justice",
    "url": "https://www.indiacode.nic.in/handle/123456789/15256",
    "keywords": ["CCPA penalty", "misleading advertisement penalty", "endorser penalty", "fine", "ten lakh", "fifty lakh"],
    "needsVerification": false,
    "text": "Section 21: Power of Central Authority to issue directions and penalties against false or misleading advertisements: (1) Where the Central Authority is satisfied after investigation that any advertisement is false or misleading and is prejudicial to the interest of any consumer or is in contravention of consumer rights, it may, by order, issue directions to discontinue or modify such advertisement. (2) The Central Authority may impose on any manufacturer or endorser a penalty which may extend to ten lakh rupees; and for every subsequent contravention, a penalty extending to fifty lakh rupees."
  },
  {
    "id": "cpa2019-sec34-district-comm",
    "document": "Consumer Protection Act, 2019",
    "section": "Section 34",
    "authority": "Ministry of Law and Justice",
    "url": "https://www.indiacode.nic.in/handle/123456789/15256",
    "keywords": ["District Commission jurisdiction", "pecuniary limit", "territorial jurisdiction", "residence of complainant", "resides", "residence", "territorial", "home", "local limits", "where to file"],
    "needsVerification": true,
    "text": "Section 34: Jurisdiction of District Commission: (1) Subject to the other provisions of this Act, the District Commission shall have jurisdiction to entertain complaints where the value of the goods or services paid as consideration does not exceed the prescribed limit (prescribed as ₹50 Lakh under 2021 Rules). (2) A complaint shall be instituted in a District Commission within the local limits of whose jurisdiction: (a) the opposite party resides or carries on business; or (d) the complainant resides or personally works for gain."
  },
  {
    "id": "cpa2019-sec35-filing-complaint",
    "document": "Consumer Protection Act, 2019",
    "section": "Section 35",
    "authority": "Ministry of Law and Justice",
    "url": "https://www.indiacode.nic.in/handle/123456789/15256",
    "keywords": ["manner of filing complaint", "electronic filing", "e-Daakhil", "fee payment", "admissibility", "online", "electronic", "how to file", "fee"],
    "needsVerification": false,
    "text": "Section 35: Manner in which complaint shall be made: (1) A complaint, in relation to any goods sold or delivered or agreed to be sold or delivered or any service provided or agreed to be provided, may be filed with a District Commission by the consumer or any recognised consumer association. (2) Every complaint filed shall be accompanied with such fee and in such manner, including electronic form, as may be prescribed."
  },
  {
    "id": "cpa2019-sec69-limitation",
    "document": "Consumer Protection Act, 2019",
    "section": "Section 69",
    "authority": "Ministry of Law and Justice",
    "url": "https://www.indiacode.nic.in/handle/123456789/15256",
    "keywords": ["limitation period", "two years", "delay condonation", "cause of action", "time limit"],
    "needsVerification": false,
    "text": "Section 69: Limitation period: (1) The District Commission, the State Commission or the National Commission shall not admit a complaint unless it is filed within two years from the date on which the cause of action has arisen. (2) A complaint may be entertained after the period specified in sub-section (1), if the complainant satisfies the Commission that he had sufficient cause for not filing the complaint within such period, recording reasons for condoning such delay."
  },
  {
    "id": "ecom-rules-2020-rule4-duties",
    "document": "Consumer Protection (E-Commerce) Rules, 2020",
    "section": "Rule 4 & 5",
    "authority": "Department of Consumer Affairs",
    "url": "https://consumeraffairs.nic.in/acts-and-rules/consumer-protection",
    "keywords": ["e-commerce duties", "grievance officer", "48 hours acknowledgement", "one month resolution", "contact details"],
    "needsVerification": true,
    "text": "Rule 4 & 5: Duties of e-commerce entities and marketplace entities: (1) Every e-commerce entity shall establish an adequate grievance redressal mechanism and appoint a Grievance Officer whose name, designation and contact details shall be displayed prominently on its platform. (2) The Grievance Officer shall acknowledge the receipt of any consumer complaint within forty-eight hours and redress the complaint within one month from the date of receipt. (3) Entities shall not adopt any unfair trade practice or manipulate the price of goods or services offered on its platform."
  },
  {
    "id": "ecom-rules-2020-rule6-cancellation",
    "document": "Consumer Protection (E-Commerce) Rules, 2020",
    "section": "Rule 6 & 7",
    "authority": "Department of Consumer Affairs",
    "url": "https://consumeraffairs.nic.in/acts-and-rules/consumer-protection",
    "keywords": ["cancellation charges", "unilateral cancellation", "return policy", "consent for purchase", "pre-ticked boxes forbidden"],
    "needsVerification": true,
    "text": "Rule 6 & 7: Cancellation charges and refund rules: (1) No e-commerce entity shall impose cancellation charges on consumers cancelling after confirming purchase unless similar charges are also borne by the e-commerce entity if they cancel the purchase order unilaterally for any reason. (2) No e-commerce entity shall manipulate search results or discriminate against sellers. (3) No entity shall record consent for purchase automatically, including through pre-ticked checkboxes."
  },
  {
    "id": "nch-redressal-1915",
    "document": "National Consumer Helpline Redressal Guide",
    "section": "NCH Standard Operating Procedure",
    "authority": "Department of Consumer Affairs",
    "url": "https://consumerhelpline.gov.in/",
    "keywords": ["NCH", "1915", "pre-litigation", "helpline", "toll-free", "convergence company", "docket"],
    "needsVerification": true,
    "text": "National Consumer Helpline (NCH): A government-run informal grievance redressal platform. Consumers can call toll-free 1915, send SMS to 8800001915, or register on consumerhelpline.gov.in. NCH operates a 'Convergence Model' with more than 1,000 participating corporate companies where grievances are directly transmitted to brand nodal officers for pre-litigation settlement, avoiding court litigation in over 85% of cases."
  },
  {
    "id": "edaakhil-process-overview",
    "document": "e-Daakhil Online Filing Manual",
    "section": "Portal Workflow Guide",
    "authority": "NCDRC / National Informatics Centre",
    "url": "https://edaakhil.nic.in",
    "keywords": ["e-Daakhil", "electronic filing", "online court fee", "complaint petition", "cause list", "video conference"],
    "needsVerification": true,
    "text": "e-Daakhil Portal (edaakhil.nic.in): Conceptualized by NCDRC and implemented by NIC, this portal enables hassle-free electronic filing of consumer complaints before District, State, and National Commissions. Consumers can register using mobile OTP, draft or upload petition PDF, upload index of documents, calculate and pay court fees online via payment gateway (Bharatkosh), receive SMS hearing alerts, and attend virtual hearings without hiring a mandatory lawyer."
  },
  {
    "id": "cdrc-jurisdiction-limits-2021",
    "document": "Consumer Protection Commission Jurisdiction Rules, 2021",
    "section": "Rules 3, 4 and 5",
    "authority": "Department of Consumer Affairs",
    "url": "https://consumeraffairs.nic.in/acts-and-rules/consumer-protection",
    "keywords": ["pecuniary jurisdiction", "district commission 50 lakh", "state commission 2 crore", "national commission above 2 crore", "consideration paid"],
    "needsVerification": true,
    "text": "Pecuniary Jurisdiction Thresholds (Rules 2021): (1) District Commission: Entertains complaints where value of goods or services paid as consideration does not exceed fifty lakh rupees (₹50,00,000). (2) State Commission: Entertains complaints where consideration paid exceeds fifty lakh rupees but does not exceed two crore rupees (₹2,00,00,000). (3) National Commission (NCDRC): Entertains complaints where consideration paid exceeds two crore rupees (₹2,00,00,000). Crucially, jurisdiction is calculated based on 'consideration paid', not the total compensation demanded."
  }
];
