const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ExternalHyperlink, HeadingLevel,
  AlignmentType, BorderStyle, ShadingType, Table, TableRow, TableCell,
  WidthType, PageBreak,
} = require("docx");

const ROOT = "C:/Users/saumy/OneDrive/Documents/Glogift2026";
const OUT = path.join(ROOT, "design/social/week-2-theme/GLOGIFT-27-Week-2-Social-Post-Content.docx");
const BLUE = "1E3A8A", ORANGE = "C2410C", DARK = "0F172A", GREY = "475569", PAPER = "FDF8F2";

const p = (text, options = {}) => new Paragraph({
  spacing: { after: options.after ?? 150, line: options.line ?? 300 },
  alignment: options.alignment,
  children: [new TextRun({ text, bold: options.bold, size: options.size ?? 22, color: options.color ?? DARK })],
});

const link = (label, url) => new Paragraph({
  spacing: { after: 110 },
  children: [
    new TextRun({ text: `${label}: `, bold: true, size: 22, color: DARK }),
    new ExternalHyperlink({
      link: url,
      children: [new TextRun({ text: url, style: "Hyperlink", size: 22 })],
    }),
  ],
});

const heading = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 220, after: 140 },
  border: { bottom: { color: ORANGE, style: BorderStyle.SINGLE, size: 8, space: 7 } },
  children: [new TextRun({ text, bold: true, color: BLUE, size: 32 })],
});

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Aptos", size: 22, color: DARK }, paragraph: { spacing: { line: 300 } } } },
  },
  sections: [{
    properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: "GLOGIFT 27", bold: true, size: 44, color: BLUE })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "WEEK 2 SOCIAL MEDIA POST CONTENT", bold: true, size: 25, color: ORANGE, characterSpacing: 80 })],
      }),
      p("Theme Explainer: Flexibility · Digitalisation · Decarbonization", { alignment: AlignmentType.CENTER, bold: true, size: 24, color: GREY, after: 280 }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        rows: [new TableRow({ children: [
          new TableCell({ width: { size: 4680, type: WidthType.DXA }, shading: { fill: PAPER, type: ShadingType.CLEAR }, children: [p("Conference website", { bold: true, color: ORANGE, after: 70 }), link("Visit", "https://glogift2027.in")] }),
          new TableCell({ width: { size: 4680, type: WidthType.DXA }, shading: { fill: PAPER, type: ShadingType.CLEAR }, children: [p("Submission portal", { bold: true, color: ORANGE, after: 70 }), link("Submit", "https://glogift2027.in/login")] }),
        ] })],
      }),

      heading("LinkedIn Post"),
      p("Three words in our 2027 theme, and why each is there."),
      p("FLEXIBILITY. Adaptability is not the same as automation. An organisation that has automated a rigid process has a faster rigid process. The flexible systems tradition asks what actually lets an enterprise change its mind—and AI can either widen that capacity or quietly narrow it."),
      p("DIGITALISATION. The important questions are no longer only about model accuracy. What happens when an AI recommendation meets an accountable human being who must defend the decision afterwards? Governance is increasingly the binding constraint on adoption."),
      p("DECARBONIZATION. AI is being asked to help decarbonise operations and supply chains while itself consuming meaningful energy. Both halves of that ledger belong in the same conversation."),
      p("GLOGIFT 27 · IIM Sambalpur · 25–27 February 2027 · Hybrid", { bold: true, color: BLUE }),
      p("Last date to submit abstracts: 23 November 2026", { bold: true, color: ORANGE }),
      link("Conference website", "https://glogift2027.in"),
      link("Submission portal", "https://glogift2027.in/login"),
      p("Extended hashtag bank", { bold: true, color: ORANGE, after: 60 }),
      p("#GLOGIFT27 #GLOGIFT2027 #IIMSambalpur #GIFTSociety #CallForSubmission #CallForPapers #CallForAbstracts #AbstractSubmission #PaperSubmission #AcademicConference #InternationalConference #HybridConference #ConferenceIndia #ManagementResearch #BusinessResearch #FlexibleSystemsManagement #AIinManagement #ArtificialIntelligence #ResponsibleAI #AIGovernance #AIEthics #DigitalTransformation #GenerativeAI #DataAnalytics #Industry50 #FutureOfWork #Decarbonization #Sustainability #SustainableFinance #ESG #NetZero #ClimateAction #CircularEconomy #AcademicPublishing #ResearchImpact #PhDChat #DoctoralResearch #ResearchScholars #EarlyCareerResearcher #Academia #HigherEducationIndia #Odisha #Sambalpur", { color: GREY }),

      new Paragraph({ children: [new PageBreak()] }),
      heading("Instagram Post"),
      p("Three words. Three management questions.", { bold: true, size: 27, color: BLUE }),
      p("FLEXIBILITY", { bold: true, color: ORANGE, after: 40 }),
      p("Does AI make an organisation more adaptable—or simply automate what is already rigid?"),
      p("DIGITALISATION", { bold: true, color: ORANGE, after: 40 }),
      p("Who remains accountable when an AI recommendation becomes a management decision?"),
      p("DECARBONIZATION", { bold: true, color: ORANGE, after: 40 }),
      p("Can AI reduce emissions while we account honestly for the energy it consumes?"),
      p("Swipe through the 2027 theme →"),
      p("GLOGIFT 27 · 25–27 February 2027 · IIM Sambalpur · Hybrid", { bold: true, color: BLUE }),
      p("Last date to submit abstracts: 23 November 2026", { bold: true, color: ORANGE }),
      link("Visit the conference website", "https://glogift2027.in"),
      link("Visit the submission portal", "https://glogift2027.in/login"),
      p("Extended Instagram hashtag bank", { bold: true, color: ORANGE, after: 60 }),
      p("#GLOGIFT27 #GLOGIFT2027 #IIMSambalpur #GIFTSociety #CallForSubmission #CallForPapers #CFP #CallForAbstracts #AbstractSubmission #PaperSubmission #SubmitYourPaper #ConferenceAlert #AcademicConference #InternationalConference #HybridConference #ConferenceIndia #Conference2027 #ManagementResearch #BusinessResearch #FlexibleSystemsManagement #AIinManagement #ArtificialIntelligence #ResponsibleAI #AIGovernance #AIEthics #GenerativeAI #MachineLearning #DataAnalytics #BigData #IntelligentSystems #DigitalTransformation #Industry50 #FutureOfWork #Decarbonization #SustainableFinance #Sustainability #ESG #NetZero #ClimateAction #GreenBusiness #CircularEconomy #SustainableDevelopment #StrategyResearch #Innovation #Entrepreneurship #SupplyChainManagement #OperationsManagement #MarketingResearch #ConsumerInsights #FinTech #DigitalFinance #HumanCapital #Leadership #InclusiveGrowth #PhDChat #PhDLife #DoctoralResearch #ResearchScholars #EarlyCareerResearcher #Academia #Researchers #BSchool #MBA #ManagementStudents #FacultyDevelopment #IndustryProfessionals #IIM #Odisha #Sambalpur #HigherEducationIndia #AcademicEvent #KnowledgeSharing #Networking #AcademicPublishing #Springer #ResearchImpact #PeerReview", { color: GREY }),

      new Paragraph({ children: [new PageBreak()] }),
      heading("Email to the PR Chair, IIM Sambalpur"),
      p("Subject: Request to publish GLOGIFT 27 Week 2 campaign on IIM Sambalpur social media", { bold: true, color: ORANGE }),
      p("Dear Chair, PR & Media Committee,"),
      p("I hope you are doing well."),
      p("The Week 2 social media campaign for GLOGIFT 27 is ready for publication. This campaign explains the conference theme—AI-Driven Solutions in Management—through its three central ideas: flexibility, digitalisation and decarbonization."),
      p("Separate carousel creatives have been prepared for LinkedIn and Instagram. Each set concludes with the abstract submission deadline, conference website and a QR code leading to the submission portal. Platform-specific captions and hashtag banks are also included."),
      p("May I request the PR & Media Committee to review and publish the campaign through the official IIM Sambalpur LinkedIn and Instagram accounts? A reshare through the institute's other official channels would also help us reach faculty members, doctoral scholars, researchers, practitioners and prospective participants."),
      p("Suggested publication schedule:", { bold: true, color: BLUE, after: 60 }),
      p("LinkedIn: 10:30 AM IST"),
      p("Instagram: 7:30 PM IST"),
      link("Conference website", "https://glogift2027.in"),
      link("Submission portal", "https://glogift2027.in/login"),
      p("Last date to submit abstracts: 23 November 2026", { bold: true, color: ORANGE }),
      p("The LinkedIn carousel, Instagram carousel and approved post copy are attached for your consideration. Please let me know if any changes are required before publication."),
      p("Thank you for your support in promoting GLOGIFT 27."),
      p("Warm regards,"),
      p("[Name]", { bold: true, after: 40 }),
      p("GLOGIFT 27 Organising Team", { color: GREY }),

      heading("Posting Notes"),
      p("LinkedIn: Upload the five square images in numerical order."),
      p("Instagram: Upload the five portrait images in numerical order."),
      p("Suggested alt text: Five-slide illustrated carousel explaining the GLOGIFT 27 theme through flexibility, digitalisation and decarbonization, followed by the abstract submission deadline and a QR code linking to the conference portal."),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(OUT, buffer);
  console.log(OUT);
});
