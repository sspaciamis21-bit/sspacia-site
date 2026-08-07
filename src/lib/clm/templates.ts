
/**
 * CLM Agreement Templates
 * Generates Tiptap JSON content based on the official agreement text.
 */


export interface TemplateData {
  date: string;
  companyAddress: string;
  customerName: string;
  customerOrg: string;
  customerDesignation: string;
  customerPan: string;
  customerPhone: string;
  customerEmail: string;
  userId: string;
  productType: string;
  productName: string;
  centerAddress: string;
  period: string;
  startDate: string;
  expiryDate: string;
  cost: string;
  costInWords: string;
  calculatedCost: string;
  calculatedCostInWords: string;
  capacity: string;
  depositAmount: string;
  depositAmountInWords: string;
  lockInPeriod: string;
  noticePeriod: string;
  escalationPercentage: string;
  renewalDate: string;
  contractNumber: string;
}

export function formatIndianCurrency(amount: string | number): string {
    const x = amount.toString();
    const lastThree = x.substring(x.length - 3);
    const otherNumbers = x.substring(0, x.length - 3);
    if (otherNumbers !== '') {
        return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
    }
    return lastThree;
}

export function numberToWordsIndian(num: number): string {
    if (num === 0) return "Zero";
    const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teenDigits = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const doubleDigits = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function getWords(n: number): string {
        let str = "";
        if (n > 99) {
            str += singleDigits[Math.floor(n / 100)] + " Hundred ";
            n %= 100;
        }
        if (n > 19) {
            str += doubleDigits[Math.floor(n / 10)] + " ";
            n %= 10;
        } else if (n > 9) {
            str += teenDigits[n - 10] + " ";
            return str;
        }
        if (n > 0) {
            str += singleDigits[n] + " ";
        }
        return str;
    }

    let n = Math.floor(num);
    let result = "";
    if (Math.floor(n / 10000000) > 0) {
        result += getWords(Math.floor(n / 10000000)) + "Crore ";
        n %= 10000000;
    }
    if (Math.floor(n / 100000) > 0) {
        result += getWords(Math.floor(n / 100000)) + "Lakh ";
        n %= 100000;
    }
    if (Math.floor(n / 1000) > 0) {
        result += getWords(Math.floor(n / 1000)) + "Thousand ";
        n %= 1000;
    }
    if (n > 0) {
        result += getWords(n);
    }
    return result.trim() + " Rupees Only";
}

export function generateInitialAgreement(data: TemplateData) {
  const formattedCost = formatIndianCurrency(data.cost);
  const formattedCalculatedCost = formatIndianCurrency(data.calculatedCost);
  const formattedDeposit = formatIndianCurrency(data.depositAmount);

  return {
    type: "doc",
    content: [
      { 
        type: "heading", 
        attrs: { level: 1, textAlign: "center" }, 
        content: [{ type: "text", text: "LEAVE AND LICENCE AGREEMENT" }] 
      },
      { 
        type: "paragraph", 
        attrs: { textAlign: "justify" },
        content: [
          { type: "text", text: "This LEAVE AND LICENCE AGREEMENT (“Agreement”) is made, entered in to and executed on " },
          { type: "text", marks: [{ type: "bold" }], text: data.date },
          { type: "text", text: " at Ahmedabad, Gujarat, India by and between:" }
        ] 
      },
      {
        type: "paragraph",
        attrs: { textAlign: "justify" },
        content: [
          { type: "text", marks: [{ type: "bold" }], text: data.companyAddress },
          { type: "text", text: " by its Authorized Signatory, Mr. Praveen Dilip Agarwal, Director hereinafter described as “Provider” which expression shall mean and include all of its successors, legal heirs, executors, and administrators being the party of the first part" }
        ]
      },
      { 
        type: "paragraph", 
        attrs: { textAlign: "center" }, 
        content: [{ type: "text", text: "AND" }] 
      },
      {
        type: "paragraph",
        attrs: { textAlign: "justify" },
        content: [
          { type: "text", marks: [{ type: "bold" }], text: data.customerOrg },
          { type: "text", text: ", having registered office at " },
          { type: "text", marks: [{ type: "bold" }], text: data.customerOrg },
          { type: "text", text: " by its Authorized Signatory – " },
          { type: "text", marks: [{ type: "bold" }], text: data.customerName },
          { type: "text", text: ", Designation - " },
          { type: "text", marks: [{ type: "bold" }], text: data.customerDesignation },
          { type: "text", text: " bearing PAN No " },
          { type: "text", marks: [{ type: "bold" }], text: data.customerPan },
          { type: "text", text: " authorized by Board Resolution being the party of the second part (hereinafter described as “Client” which expression shall, wherever the context so requires or admits, mean and include all of its successors, affiliates, executors, administrators, and assigns). The Provider and Client shall, wherever the context may hereinafter so require, be collectively referred to as ‘Clients’ and individually as ‘Client’, as the case may be." }
        ]
      },
      { 
        type: "paragraph", 
        attrs: { textAlign: "justify" },
        content: [
          { type: "text", text: "WHEREAS the Client has been allotted a Client Id as " },
          { type: "text", marks: [{ type: "bold" }], text: data.contractNumber },
          { type: "text", text: " This Client Id will be used for all future correspondences." }
        ] 
      },
      {
        type: "paragraph",
        attrs: { textAlign: "justify" },
        content: [
          { type: "text", text: "WHEREAS the Provider has permitted the Client, their officers, their employees, to use and occupy " },
          { type: "text", marks: [{ type: "bold" }], text: data.productType },
          { type: "text", text: " defined as " },
          { type: "text", marks: [{ type: "bold" }], text: data.productName },
          { type: "text", text: " at center " },
          { type: "text", marks: [{ type: "bold" }], text: data.centerAddress },
          { type: "text", text: " (herein after referred to as the said “Space”) for the purpose of their Corporate Office." }
        ]
      },
      {
        type: "paragraph",
        attrs: { textAlign: "justify" },
        content: [
          { type: "text", text: "AND WHEREAS pursuant to mutual negotiation ensued between the Parties hereto, the Provider has agreed to provide Space on leave and license to the Client as the office premises for a period as described in this Agreement, in consideration of the License fee and on the terms and conditions mutually agreed upon between them and recorded hereinafter as under:" }
        ]
      },
      
      // Clauses
      {
        type: "paragraph",
        attrs: { textAlign: "justify" },
        content: [
          { type: "text", marks: [{ type: "bold" }], text: "1. PERIOD: " },
          { type: "text", text: "This Agreement is valid for the period of " },
          { type: "text", marks: [{ type: "bold" }], text: data.period },
          { type: "text", text: " from " },
          { type: "text", marks: [{ type: "bold" }], text: data.startDate },
          { type: "text", text: " to " },
          { type: "text", marks: [{ type: "bold" }], text: data.expiryDate },
          { type: "text", text: ". On the expiry of this period, the Agreement comes to an end and the Client is understood to have vacated the office premises and handed over the quiet, peaceful, physical and legal possession of the said premises to the Provider and the Provider has taken over the possession of the said premises from the Client irrespective of whether or not any written letter is exchanged between the two." }
        ]
      },
      {
        type: "paragraph",
        attrs: { textAlign: "justify" },
        content: [
          { type: "text", marks: [{ type: "bold" }], text: "2. LICENCE FEE: " },
          { type: "text", text: "That during the period of this leave and license Agreement, the Client, the party of the second part shall pay to the Provider, the party of the first part, the fee of " },
          { type: "text", marks: [{ type: "bold" }], text: `Rs. ${formattedCost} (${data.costInWords})` },
          { type: "text", text: " + GST (as applicable time to time) per person per month. The payment shall be made in advance, via electronic transfer, to the designated account of the Provider, on or before 10 days from the date of the invoice. Presently, Provider is providing a " },
          { type: "text", marks: [{ type: "bold" }], text: data.productType },
          { type: "text", text: " of " },
          { type: "text", marks: [{ type: "bold" }], text: data.capacity },
          { type: "text", text: " to the client against which an agreed amount of " },
          { type: "text", marks: [{ type: "bold" }], text: `Rs. ${formattedCalculatedCost} (${data.calculatedCostInWords})` },
          { type: "text", text: " + GST (as applicable time to time) per month will be paid by the Client to the Provider through NEFT/Bank Transfers. This fee includes access to office accommodation as offered, cleaning, electricity, internet, tea and coffee. If the no. of person increases, invoice will be raised as per total no. of person of the Client. It is the express understanding between the parties that the limited rights given to the client shall only be confined to the area and Space allotted to the client. The client shall not claim any rights whatsoever for the common areas or any other area in the co-working space premises." }
        ]
      },
      {
        type: "paragraph",
        attrs: { textAlign: "justify" },
        content: [
          { type: "text", marks: [{ type: "bold" }], text: "3. DEPOSIT: " },
          { type: "text", text: `The Provider shall retain security deposit of 3 months which presently for ${data.capacity} seats comes out to be ` },
          { type: "text", marks: [{ type: "bold" }], text: `Rs. ${formattedDeposit} (${data.depositAmountInWords})` },
          { type: "text", text: " to be paid by the Client to the Provider through NEFT/ bank transfer vide this Leave and License Agreement, by way of interest free refundable security deposit. Client has been allotted Security Deposit Id as " },
          { type: "text", marks: [{ type: "bold" }], text: data.contractNumber },
          { type: "text", text: ". This security deposit shall be refundable on demand by the Client simultaneously on completion of the term of this Agreement after adjusting the outstanding dues if any payable by the Client. If number of seats increases, additional security deposit as applicable will be required to be provided to the Provider by the Client." }
        ]
      },
      {
        type: "paragraph",
        attrs: { textAlign: "justify" },
        content: [
          { type: "text", marks: [{ type: "bold" }], text: "4. LOCK-IN PERIOD: " },
          { type: "text", text: "As agreed by both parties, Lock-in Period of " },
          { type: "text", marks: [{ type: "bold" }], text: data.lockInPeriod },
          { type: "text", text: " is applicable. This Agreement cannot be terminated during the lock-in period. The Client understands that the negotiations between the Client and the Provider have been based on the lock-in period agreed by the Client. Further, Provider shall not only be holding the space for the Client but also not allowing any future clients to take up that space. Any violation of the lock-in period causes a huge amount of loss to Provider not only with regard to potential income being generated by the Client for the space for the duration of the lock-in period but also due to Providers inability to give out the said space to any new clients. The violation of the lock-in period by the Client also disrupts the expansion plans of the Provider as once this agreement is entered into, Provider shall operate under the assumption that the Client shall continue to avail the services for the duration of the lock-in period. The Client agrees that the violation of the lock-in period shall cause substantial loss to the business of Provider. The Client agrees that if, in an exception case the Client seeks to terminate this Agreement before expiration of the lock-in period, Provider shall be entitled to damages amounting to the license fees for the remaining lock-in period. Client will not be allowed to reduce number of seats during the currency of lock-in period." }
        ]
      },
      {
        type: "paragraph",
        attrs: { textAlign: "justify" },
        content: [
          { type: "text", marks: [{ type: "bold" }], text: "5. NOTICE PERIOD: " },
          { type: "text", text: "Notice Period will be applicable post completion of the lock-in period. After completion of lock-in period, in case either party to this Agreement intends to terminate this Agreement before the expiry of the term of this Agreement, one will have to give " },
          { type: "text", marks: [{ type: "bold" }], text: data.noticePeriod },
          { type: "text", text: " written notice to the other party and on expiry of the notice period, this leave and license Agreement shall come to an end and on possession of the quiet and physical possession the accounts of the Client after adjusting outstanding dues of whatever nature." }
        ]
      },
      {
        type: "paragraph",
        attrs: { textAlign: "justify" },
        content: [
          { type: "text", marks: [{ type: "bold" }], text: "6. RENEWAL AND ESCALATION: " },
          { type: "text", text: "In case, the Client intends to renewal of Agreement, it will intimate so to the Client and if agreed to by the Provider, the fresh agreement will be entered in to and executed either with the same terms and conditions or alteration there to as may be agreed upon by both the parties to the Agreement. As agreed by both the parties, after completion of 1 year from agreement start date i.e. from " },
          { type: "text", marks: [{ type: "bold" }], text: data.renewalDate },
          { type: "text", text: ", license fee will be escalated as " },
          { type: "text", marks: [{ type: "bold" }], text: data.escalationPercentage },
          { type: "text", text: " every year of this agreement." }
        ]
      },
      { 
        type: "paragraph", 
        attrs: { textAlign: "left" },
        content: [{ type: "text", marks: [{ type: "bold" }], text: "7. Contact details for the Client at the time of agreement will be as under:" }] 
      },
      { type: "paragraph", content: [{ type: "text", text: `Name of Contact Person: ${data.customerName}` }] },
      { type: "paragraph", content: [{ type: "text", text: `Contact Number: ${data.customerPhone}` }] },
      { type: "paragraph", content: [{ type: "text", text: `Email Address: ${data.customerEmail}` }] },
      
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "8. COMPLY with CODE OF CONDUCT: " },
        { type: "text", text: "The Client must comply with any Code of Conduct and rules which the Provider imposes generally on users of the Centre." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", text: "9. If the Client puts an end to this agreement without proper written notice within stipulated time, it does not put an end to any outstanding obligations, including additional services used, requested or required under the agreement and the monthly office fee for the remainder of the period for which this agreement would have lasted if the Provider had not ended it." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "10. If the Centre is no longer available: " },
        { type: "text", text: "In the event that the Provider is permanently unable to provide the services and accommodation(s) at the Centre stated in this agreement then this agreement will end and the Client will only have to pay monthly office fees up to the date it ends and for the additional services the Client has used. The Provider will not be liable to pay any compensation in that case." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", text: "11. When this agreement ends the Client has to vacate the accommodation(s) immediately, leaving the accommodation(s) in the same condition as it was when the Client took it. If the Client leaves any property in the Centre the Provider may dispose of it at the Client’s cost in any way the Provider chooses without owing the Client any responsibility for it or any proceeds of sale. If the Client continues to use the accommodation(s) when this agreement has ended the Client is responsible for any loss, claim or liability the Provider incurs as a result of the Client’s failure to vacate on time. The Provider may, at its discretion, permit the Client an extension subject to a surcharge on the monthly office fee." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "12. NOTICES: " },
        { type: "text", text: "All formal notices must be in writing only addressed to respective parties at the addresses mentioned in this Agreement.  E-mail communications will be valid." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "13. CONFIDENTIALITY: " },
        { type: "text", text: "The terms of this agreement are confidential. Neither the Provider nor the Client must disclose them without the other’s consent unless required to do so by law or an official authority. This obligation continues for a period of 3 years after this agreement ends." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "14. OFFICE SERVICES: " },
        { type: "text", text: "The Provider is to provide during normal opening hours the services, if requested, described in the relevant service description (which is available on request). If the Provider decides that a request for any particular service is excessive, it reserves the right to charge an additional fee." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "15. PERSONALIZED BRANDING: " },
        { type: "text", text: "Client will be allowed to do personalized branding, which do not damage existing walls, fixtures or fittings, inside their Space only after prior permission of Provider.  Outside their Space on glass door, provision of Client’s company name on the door of Client’s cabin will be done by Provider as per existing policy of Provider.  Display of Client’s company name, logo or brand will be allowed at Reception designated area at a fee of Rs. 5000/- per annum." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "16. Agreement and Legal Charges: " },
        { type: "text", text: "The legal and leave and license agreement charges shall be borne by the Client. Currently it is charged as Rs. 2000/-.  In case of any change in stamp duty charges, same will be revised after prior intimation.  In case of renewal also, the charges will be re-applicable and will be billed in Client’s invoice." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "17. THE PROVIDER’S IT: " },
        { type: "text", text: "Whilst the Provider has internet security protocols, the Provider does not make any representations as to the security of the Provider’s network (or the internet) or of any information that the Client places on it. The Client should adopt whatever security measures (such as encryption) it believes are appropriate to its circumstances. The Provider cannot guarantee that a particular degree of availability will be attained in connection with the Client’s use of the Provider’s network (or the internet).  For different firewall settings, the Client shall install their own line, based on the existing infrastructure and after prior approval from the Provider.  The line can be installed at charges of Rs. 5000/- to the Provider and Rs. 2000/- per month to the Provider toward electrical and server area charges." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "18. ACCESS TO THE ACCOMMODATION(S): " },
        { type: "text", text: "The Provider may need to enter the Client’s accommodation(s) and may do so at any time. However, unless there is an emergency or the Client has given notice to terminate, the Provider will attempt to notify the Client verbally or electronically in advance when the Provider needs access to carry out testing, repair or works other than routine inspection, cleaning and maintenance. The Provider will also endeavour to respect reasonable security procedures to protect the confidentiality of the Client’s business." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "19. AVAILABILITY AT THE START OF THIS AGREEMENT: " },
        { type: "text", text: "If for any reason the Provider cannot provide the accommodation(s) stated in this agreement by the date when this agreement is due to start it has no liability to the Client for any loss or damages.  The Provider will not charge the Client the monthly office fee for accommodation(s) the Client cannot use until it becomes available." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", text: "20. The Client must not alter any part of its accommodation and must take good care of all parts of the centre, its equipment, fixtures, fittings and furnishings which the Client uses. The Client is liable for any damage caused by it or those in the Centre with the Client’s permission or at the Client’s invitation whether express or implied, including but not limited to all employees, contractors, agents or other persons present on the premises." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "21. OFFICE EQUIPMENT: " },
        { type: "text", text: "The Client must not install any cabling, IT or telecom connections without the Provider’s consent, which the Provider may refuse at its absolute discretion." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "22. ASSETS BROUGHT BY CLIENT: " },
        { type: "text", text: "The Client will be allowed to bring and place assets to their Space only after prior consent of Provider.  Assets brought should not create any damage to property." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", text: "23. As a condition to the Provider’s consent, the Client must permit the Provider to oversee any installations (for example IT or electrical systems) and to verify that such installations do not interfere with the use of the accommodation(s) by other Clients or the Provider or any landlord of the building." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "24. INSURANCE: " },
        { type: "text", text: "It is the Client’s responsibility to arrange insurance for its own property which it brings into the Centre and for its own liability to its employees and to third parties. The Provider strongly recommends that the Client put such insurance in place." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", text: "25. The Client must only use the accommodation(s) for office purposes. Office use of a “retail” or “medical” nature, involving frequent visits by members of the public, is not permitted." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", text: "26. The Client must not carry on a business that competes with the Provider’s business of providing serviced office accommodation(s) or its ancillary services." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "27. USE OF THE CENTRE ADDRESS: " },
        { type: "text", text: "The Client may use the Centre address as its business address. Any other uses are prohibited without the Provider’s prior written consent." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "28. BUSINESS REGISTRATIONS: " },
        { type: "text", text: "The Client may, subject to written consent of the Provider, be entitled to (i) register its business entity at the designated centre as their registered office for compliance purposes; and (ii) procure GST registration for its business. Any usage of the centre address shall not be undertaken by the Client without prior written approval from the Provider. The Client shall obtain business registrations by its own efforts and the Provider shall not be liable for any further assistance with regard to business registration of the Client." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", text: "29. Where this agreement has expired or has been terminated in accordance with this clause, and the Client has been availing business address registration services from the Provider, the Client shall a) transfer the registered address to a location outside the premises of the Provider; b) Complete the deregistration of the Provider’s address with the local authorities, and c) Complete all obligations in relation to a) and b) within 30 days of termination of this Agreement.  The Client shall provide the Provider with documentary proof that deregistration has been completed.  Where the Client fails to deregister in accordance with the clause, the Provider shall be entitled to the license fee for any number of months till office premises of the Provider remain registered as if this agreement has not been terminated." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "30. COMPLY WITH THE LAW: " },
        { type: "text", text: "The Client and the Provider must comply with all relevant laws and regulations in the conduct of its business in relation to this agreement. The Client must do nothing illegal in connection with its use of the Business Centre. The Client must not do anything that may interfere with the use of the Centre by the Provider or by others, (including but not limited to political campaigning or immoral activity), cause any nuisance or annoyance, or cause loss or damage to the Provider (including damage to reputation) or to the owner of any interest in the building which contains the Centre the Client is using. Both the Client and the Provider shall comply at all times with all relevant anti-bribery and anti-corruption laws. If the Provider has been advised by any government authority or other legislative body that it has reasonable suspicion that the Client is conducting criminal activities from the Centre then the Provider shall be entitled to terminate this agreement with immediate effect." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", text: "31. The Client acknowledges that (a) the terms of this clause are a material inducement in the Provider’s execution of this agreement and (b) any violation by the Client of this clause shall constitute a material default by the Client hereunder, entitling the Provider to terminate this agreement, without further notice or procedure." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "32. INDEMNITY: " },
        { type: "text", text: "The Client shall be responsible for compliance with all necessary provisions of the Companies Act, 1956/2013/ other relevant laws, and hereby agrees to indemnify and keep and hold the Provider fully indemnified and harmless from and against all claims, proceedings, damages, losses, actions, costs and expenses arising as a consequence of or out of this agreement or arising from any breach of rules and regulations of any applicable law.  In the event any government authority or official makes an inquiry regarding the Client or any information regarding the Client, or visits the Provider or any of its Centres in search of or the client, the Provider shall direct the said authority or official toe the above mentioned address of the Client.  The Client shall not be responsible for informing or intimating the Client of the same and shall not be liable towards the Client or such Government or private authority in this regard.  In case, Client actor omits to do any activity which is illegal as per law, the Client shall be solely responsible for the same. In case any cost is incurred by the Provider towards defending itself or representing itself before government authorities, the same shall be borne by the Client." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", text: "33. The Provider may collect and process personal data from and of the Client to administer contractual relationship, ensure compliance with applicable laws and regulations, and enable the Provider to provide its services and to manage its business. The Client acknowledges and accepts that such personal data may be transferred or made accessible to all entities of the Provider’s group, wherever located, for the purposes of providing the services herein." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "34. THE EXTENT OF THE PROVIDER’S LIABILITY: " },
        { type: "text", text: "To the maximum extent permitted by applicable law, the Provider is not liable to the Client in respect of any loss or damage the Client suffers in connection with this agreement, with the services or with the Client’s accommodation(s).  The Provider is not liable for any loss as a result of the Provider’s failure to provide a service as a result of mechanical breakdown, strike, termination of the Provider’s interest in the building containing the. In no event shall the Provider be liable for any loss or damage until the Client provides the Provider written notice and gives the Provider a reasonable time to put it right. If the Client believes the Provider has failed to deliver a service consistent with these terms and conditions the Client shall provide the Provider written notice of such failure and give the Provider a reasonable period to put it right." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "35. EXCLUSION OF CONSEQUENTIAL LOSSES, etc.: " },
        { type: "text", text: "The Provider will not in any circumstances have any liability for loss of business, loss of profits, loss of anticipated savings, loss of or damage to data, third party claims or any consequential loss. The Provider strongly advises the Client to insure against all such potential loss, damage, expense or liability." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", text: "36. It is hereby agreed between the parties that irrespective of the nature of dispute, the directors or partners and employees of the company or firm can not be made liable or responsible for the same in their personal capacity." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "37. LATE PAYMENT: " },
        { type: "text", text: "If the Client does not pay fees when due, a late fee @18% p.a., will be charged on all overdue balances. If the Client disputes any part of an invoice the Client must pay the amount not in dispute by the due date or be subject to late fees. The Provider also reserves the right to withhold services (including for the avoidance of doubt, denying the Client access to its accommodation(s)) while there are any outstanding fees and/or interest or the Client is in breach of this agreement." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "38. DISCOUNTS, PROMOTIONS AND OFFERS: " },
        { type: "text", text: "If the Client benefited from a special discount, promotion or offer, the Provider may discontinue that discount, promotion or offer without notice if the Client materially breaches these terms and conditions." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", text: "39. This Agreement shall be executed on requisite stamp paper or with requisite amount of franking and the original will remain with the Provider and certified copy thereof will be given to the Client." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", text: "40. In case of any dispute, the same shall be subject to Ahmadabad jurisdiction only." }
      ] },
      { type: "paragraph", attrs: { textAlign: "justify" }, content: [
        { type: "text", marks: [{ type: "bold" }], text: "41. ARBITRATION: " },
        { type: "text", text: "The Parties agree that in case of any dispute or difference arising in respect of this License between the parties, the same shall be settled by conciliation. The conciliation panel would consist of one representative each of the Provider and the Client. If any Dispute arising between the Parties is not amicably settled within thirty (30) days of commencement of amicable attempts to settle the same as provided above, the Dispute shall be referred to, and be finally settled by, arbitration and shall be submitted to a sole arbitrator, appointed by both the parties, and such submission shall be a submission to arbitration in accordance with the Indian Law as presently in force by which the Parties in dispute agree to be so bound. The Parties agree that the Dispute shall be adjudicated by a single arbitrator. The decision of the arbitrator shall be final and binding on the Parties." }
      ] },
      
      { type: "paragraph" },
      { type: "paragraph" },
      { type: "paragraph", attrs: { textAlign: "center" }, content: [{ type: "text", text: "IN WITNESS WHEREOF, the parties to this leave and license Agreement is signed on the day, month and year mentioned here in above in presence of the following witnesses." }] },
      { type: "paragraph" },
      
      {
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [
          { type: "text", marks: [{ type: "bold" }], text: "Provider" },
          { type: "text", text: "                                                                        " },
          { type: "text", marks: [{ type: "bold" }], text: "Client" }
        ]
      },
      { type: "paragraph" },
      { type: "paragraph" },
      {
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [
          { type: "text", text: "Mr. Praveen Agarwal" },
          { type: "text", text: "                                                      " },
          { type: "text", marks: [{ type: "bold" }], text: data.customerName }
        ]
      },
      {
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [
          { type: "text", text: "Director" },
          { type: "text", text: "                                                                        " },
          { type: "text", text: `Director M/s ${data.customerOrg}` }
        ]
      },
      {
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [
          { type: "text", text: "M/s Sspacia India Private Limited" },
          { type: "text", text: "                                          " },
          { type: "text", marks: [{ type: "bold" }], text: "Witness" }
        ]
      }
    ]
  };
}
