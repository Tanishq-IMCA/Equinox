'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Header } from '@/components/Landing/Header';
import { Footer } from '@/components/Landing/Footer';
import { LegalCyclingText } from '@/components/Landing/LegalCyclingText';
import GlitchyText from '@/components/ui/GlitchyText';

const sections = [
  {
    title: 'Legal Notice & Company Information',
    content: `REPOSIGHT is a proprietary software platform developed, operated, and maintained by Tanishq Giri under the IMCA (Software, Game & Server Solutions) business entity. The entire codebase, including but not limited to the Next.js frontend application, the Express backend API, the Prisma database schema, the PostgreSQL data layer, all analysis algorithms, scanner integrations, user-interface designs, brand assets, documentation, and any derivative works, is the exclusive intellectual property of Tanishq Giri and IMCA. All rights are reserved worldwide and in perpetuity. No individual, organization, or automated system is granted any license, express or implied, to use, reproduce, distribute, modify, decompile, reverse-engineer, translate, create derivative works from, sublicense, sell, rent, lease, or otherwise exploit any portion of the REPOSIGHT platform, its code, its architecture, or its visual identity without the prior written consent of the owner. Any unauthorized access, reproduction, transmission, or redistribution of this platform or its underlying code is strictly prohibited and may result in civil and criminal penalties under applicable copyright, trade-secret, and computer-fraud laws.`,
  },
  {
    title: 'Terms of Service',
    content: `These Terms of Service constitute a legally binding agreement between you and the operator of REPOSIGHT. By accessing, registering for, or using the platform in any manner, you acknowledge that you have read, understood, and agree to be bound by these terms in their entirety. If you do not agree to these terms, you must immediately discontinue all use of the platform and delete any locally cached copies of its content. The platform is provided for lawful purposes only. You agree to use REPOSIGHT solely in accordance with these terms and with all applicable local, national, and international laws, regulations, and conventions. The operator reserves the right to suspend or terminate any account, without prior notice or liability, for any conduct that violates these terms or that the operator determines, in its sole discretion, to be harmful to the platform, its users, or its reputation. These terms apply to all visitors, registered users, subscribers, and any other party who accesses or interacts with the platform, regardless of whether an account has been created.`,
  },
  {
    title: 'Account Creation & Registration',
    content: `In order to access certain features of REPOSIGHT, including repository analysis, report generation, and profile management, you may be required to create an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are solely responsible for maintaining the confidentiality of your account credentials, including your email address and password, and for all activities that occur under your account. You agree to notify the operator immediately of any unauthorized use of your account or any other breach of security. The operator will not be liable for any loss or damage arising from your failure to protect your account credentials. Accounts may be created using email and password credentials. Social-login providers such as Google and GitHub may be offered from time to time; however, availability of such providers is subject to maintenance, integration status, and platform updates. The operator reserves the right to require email-based authentication at any time.`,
  },
  {
    title: 'Acceptable Use Policy',
    content: `You agree not to use REPOSIGHT for any purpose that is unlawful, prohibited by these terms, or otherwise harmful to the platform or its users. Prohibited activities include, but are not limited to: attempting to gain unauthorized access to any portion of the platform, its servers, or its databases; interfering with or disrupting the integrity, security, or performance of the platform; using automated scripts, bots, scrapers, or other means to access or extract data from the platform without authorization; uploading, transmitting, or distributing malicious software, viruses, or harmful code; impersonating any person or entity or misrepresenting your affiliation with any person or entity; harassing, abusing, threatening, or defaming other users or third parties; using the platform to scan, analyze, or process repositories for which you do not have authorization or legal right; reverse-engineering, decompiling, disassembling, or otherwise attempting to derive the source code or architecture of the platform; and circumventing any access controls, rate limits, or security measures implemented by the operator. Violation of this policy may result in immediate suspension, termination of your account, and referral to appropriate law-enforcement authorities.`,
  },
  {
    title: 'Intellectual Property & Code Ownership',
    content: `All intellectual property rights in and to the REPOSIGHT platform, including its frontend and backend source code, database schemas, API designs, user interface layouts, visual components, animations, logos, trademarks, trade names, color schemes, typography, icons, graphics, and all associated documentation, are and shall remain the exclusive property of Tanishq Giri and IMCA. You acknowledge that you acquire no ownership, title, or interest in any such intellectual property by using the platform. The platform and its code are provided for your personal, internal use only, subject to these terms. You may not copy, reproduce, distribute, publish, display, perform, transmit, stream, broadcast, make available to the public, modify, adapt, create derivative works from, reverse-engineer, or exploit in any way any part of the platform or its code, including the frontend React components, the backend Express middleware, the Prisma schema definitions, and any scanner integration logic. Any unauthorized reproduction, distribution, or modification of the platform's code, layout, design, or functionality is expressly prohibited and will be pursued to the fullest extent of the law.`,
  },
  {
    title: 'Data, Privacy & Security',
    content: `The operator is committed to protecting the privacy and security of user information. When you create an account, connect a GitHub account, upload a resume, or initiate a repository scan, certain information is collected, processed, and stored in accordance with the platform's internal security practices. This may include account identifiers, repository metadata, analysis results, and profile information. Repository source code is analyzed transiently and is not stored permanently on the operator's servers. When a GitHub repository is analysed, the source code is cloned ephemerally to your local device environment — not to the operator's infrastructure — and all scanning and auditing processes run entirely offline against that local copy. Your repository data never leaves your machine during this process. The operator does not transmit, store, share, or otherwise process your source code beyond the scope of generating analysis reports, which contain only derived metadata, architectural observations, and quality metrics — never raw source code. GitHub OAuth credentials are used solely to authenticate repository access and are never stored, logged, or transmitted for any other purpose. The operator does not share, sell, or monetise your GitHub data, repository contents, or personal information with any third party. Industry-standard measures are employed to safeguard all data, including encryption in transit, secure authentication practices, and access controls. However, no method of transmission over the internet or electronic storage is completely secure. You acknowledge and accept the inherent risks of transmitting information online. You are responsible for maintaining the security of your own credentials and for any activity conducted through your account.`,
  },
  {
    title: 'Disclaimers & Limitation of Liability',
    content: `THE REPOSIGHT PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, THE OPERATOR DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND TITLE. THE OPERATOR DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, TIMELY, SECURE, ERROR-FREE, OR FREE FROM VIRUSES OR OTHER HARMFUL COMPONENTS. ANY RELIANCE YOU PLACE ON THE PLATFORM, INCLUDING ANALYSIS RESULTS, SCORES, RECOMMENDATIONS, OR REPORTS, IS AT YOUR OWN RISK. IN NO EVENT SHALL THE OPERATOR, ITS OWNER, EMPLOYEES, CONTRACTORS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE PLATFORM, EVEN IF THE OPERATOR HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. THE TOTAL LIABILITY OF THE OPERATOR TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM SHALL NOT EXCEED THE AMOUNT YOU HAVE PAID, IF ANY, TO THE OPERATOR FOR USE OF THE PLATFORM IN THE TWELVE MONTHS PRECEDING THE CLAIM.`,
  },
  {
    title: 'Modifications to Terms & Service',
    content: `The operator reserves the right to modify, update, or replace these Terms of Service and any other legal documentation at any time, in its sole discretion. Changes will become effective immediately upon posting to the platform or upon notice to users, whichever occurs first. Your continued use of the platform after any changes constitutes your acceptance of the revised terms. It is your responsibility to review these terms periodically. If you do not agree to the revised terms, you must stop using the platform and delete your account. The operator also reserves the right to modify, suspend, or discontinue any aspect of the platform, including features, functionality, pricing, availability, and integrations, at any time without notice or liability. The operator may, in its sole discretion, limit or restrict access to the platform or to certain features for maintenance, security, legal, or operational reasons.`,
  },
  {
    title: 'Governing Law & Dispute Resolution',
    content: `These Terms of Service and any disputes arising out of or relating to the platform shall be governed by and construed in accordance with the laws of the jurisdiction in which the operator is established, without regard to its conflict-of-law principles. Any legal action or proceeding arising out of or relating to these terms or the platform shall be brought exclusively in the courts of that jurisdiction. You hereby consent to the personal jurisdiction and venue of such courts and waive any objection to such jurisdiction or venue. Any claim or cause of action arising out of or relating to the platform must be commenced within one year after the claim or cause of action accrues; otherwise, such claim or cause of action is permanently barred. The operator's failure to enforce any right or provision of these terms shall not constitute a waiver of such right or provision. If any provision of these terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.`,
  },
  {
    title: 'Contact Information',
    content: `For questions, concerns, or legal notices regarding these Terms of Service, the REPOSIGHT platform, or any intellectual property matters, please contact the operator directly at the official email address associated with the platform. All communications should include sufficient detail to identify the nature of the inquiry and any relevant account or transaction information. The operator will endeavor to respond to legitimate inquiries in a timely manner. Unauthorized solicitations, spam, or abusive communications will not receive a response. By using the platform, you acknowledge that all official communications regarding legal matters must be directed through the designated contact channel. No other channel of communication, including social media or third-party platforms, shall be considered valid for the purpose of serving legal notices or demanding action under these terms.`,
  },
  {
    title: 'Privacy Policy',
    content: `REPOSIGHT respects your privacy and is committed to handling personal information responsibly. This Privacy Policy explains how we collect, use, store, and protect information you provide when using the platform. We collect account information such as your name, email address, and password hash when you register. We may also collect GitHub username, repository metadata, and analysis results when you connect integrations or run scans. We do not permanently store repository source code unless a specific feature requires it and you have been notified. We use your information to provide and improve the platform, authenticate your account, communicate important updates, and respond to support requests. We do not sell or rent your personal information to third parties. We may share information with service providers who assist in hosting, analytics, or security, subject to confidentiality obligations. You have the right to access, update, or delete your account information through the settings page. We retain information only as long as necessary to provide the service or comply with legal obligations.`,
  },
  {
    title: 'Cookie Policy',
    content: `REPOSIGHT uses cookies and similar technologies to operate and improve the platform. Essential cookies are required for authentication, session management, and security. These cookies enable you to log in, navigate the platform, and access protected features. We may also use analytics cookies to understand how users interact with the platform, identify performance issues, and improve user experience. You can control non-essential cookies through your browser settings; however, disabling essential cookies may prevent the platform from functioning correctly. By continuing to use the platform, you consent to our use of cookies as described in this policy. We do not use cookies to track your activity across unrelated third-party websites. We may update this Cookie Policy from time to time, and any changes will be posted on this page with an updated effective date.`,
  },
  {
    title: 'Refund & Cancellation Policy',
    content: `All payments for premium features, subscriptions, or one-time purchases made through the REPOSIGHT platform are final unless otherwise required by applicable law. You may cancel your subscription at any time through the settings or billing page. Cancellation will take effect at the end of the current billing period, and you will continue to have access to premium features until that date. We do not provide prorated refunds for partial months or unused portions of a subscription. If you experience a billing error or unauthorized charge, please contact us promptly so we can investigate and resolve the issue. We reserve the right to refuse service, terminate accounts, or cancel subscriptions for violations of these terms or for suspected fraudulent activity. In the event of a platform-wide outage or service discontinuation, we will provide reasonable notice and may offer credits or refunds at our sole discretion.`,
  },
  {
    title: 'Service Level Agreement',
    content: `REPOSIGHT aims to maintain high availability and reliability for the platform. While we do not guarantee uninterrupted service, we make commercially reasonable efforts to keep the platform accessible and functional. Scheduled maintenance may occur from time to time, and we will endeavor to provide advance notice when possible. The platform is provided without a formal uptime guarantee, and users acknowledge that occasional downtime may occur due to maintenance, technical issues, or factors beyond our control. We are not responsible for delays or failures caused by third-party services, internet connectivity issues, or force majeure events. Support requests will be addressed in a reasonable timeframe based on severity and available resources. Premium subscribers may receive priority support as described in their plan.`,
  },
  {
    title: 'Data Retention & Account Deletion',
    content: `We retain your account information and usage data for as long as your account remains active or as necessary to provide the service. You may request deletion of your account at any time through the settings page. Upon deletion, we will remove your personal information and associated data from our active systems within a reasonable period. Some information may be retained in backups or logs for a limited time for security, fraud prevention, or legal compliance purposes. Repository metadata and scan results generated during your use of the platform may be retained in anonymized or aggregated form for analytical purposes. Once an account is deleted, it cannot be recovered, and any data associated with the account will be permanently removed except as required by law or for legitimate business purposes.`,
  },
  {
    title: 'Third-Party Integrations & APIs',
    content: `REPOSIGHT may offer integrations with third-party services such as GitHub, Google, or other platforms. Your use of these integrations is subject to the terms and policies of the respective third-party providers. You are responsible for maintaining the security of your third-party accounts and for any activity that occurs through those integrations. We do not control and are not responsible for the content, security practices, or availability of third-party services. API access, if provided, is subject to rate limits, authentication requirements, and acceptable use restrictions. You may not use the API to scrape data, circumvent platform limitations, or abuse the service. We reserve the right to suspend or revoke API access for violations of these terms or for excessive usage that affects platform stability.`,
  },
  {
    title: 'Indemnification',
    content: `You agree to indemnify, defend, and hold harmless the operator of REPOSIGHT, its owner, affiliates, contractors, and agents from and against any claims, liabilities, damages, losses, costs, or expenses arising out of or relating to your use of the platform, your violation of these terms, your violation of any third-party rights, or your negligence or misconduct. This indemnification obligation survives the termination of your account and these terms. We reserve the right to assume exclusive control of any matter subject to indemnification, and you agree to cooperate with our defense of such claims. You will not settle any claim without our prior written consent. This section is intended to protect the platform operator from losses caused by user actions that violate these terms or applicable law.`,
  },
  {
    title: 'Severability & Entire Agreement',
    content: `These Terms of Service, together with the Privacy Policy, Cookie Policy, and any other legal documents posted on the platform, constitute the entire agreement between you and the operator regarding your use of the platform. They supersede all prior agreements, understandings, and communications, whether written or oral. If any provision of these terms is held to be invalid, unenforceable, or contrary to law, that provision will be modified to the minimum extent necessary to make it enforceable, or if modification is not possible, it will be severed from these terms. The remaining provisions will continue in full force and effect. No waiver of any provision will be effective unless in writing and signed by the operator. Failure to enforce any right does not waive that right or any other right.`,
  },
  {
    title: 'Billing, Payments & Subscriptions',
    content: `Access to the REPOSIGHT platform may be offered under free or paid plans. Paid subscriptions are billed in advance on a recurring basis unless otherwise stated. You agree to pay all fees and charges associated with your account at the rates in effect when the charges are incurred. All fees are non-refundable except where required by law or as expressly provided in the Refund & Cancellation Policy. You are responsible for providing valid and current payment information and for promptly updating it if it changes. If a payment fails, we may suspend or terminate your access to premium features until payment is received. We may change our prices or plan features upon reasonable notice. Any price changes will take effect at the start of the next billing cycle following the notice. You are responsible for all taxes, duties, and other governmental charges associated with your purchase. We may offer promotional pricing, discounts, or trials at our discretion, and such offers may be subject to additional terms. By subscribing, you authorize us to charge your chosen payment method on a recurring basis until you cancel. You may cancel your subscription at any time through the billing settings, and cancellation will take effect at the end of the current billing period.`,
  },
  {
    title: 'Miscellaneous Provisions',
    content: `These terms do not create any agency, partnership, joint venture, employment, or franchise relationship between you and the operator. You may not assign or transfer your rights or obligations under these terms without our prior written consent. We may assign our rights and obligations under these terms without restriction. All notices required or permitted under these terms will be in writing and delivered by email, posting on the platform, or other means reasonably calculated to reach you. The section headings in these terms are for convenience only and have no legal or contractual effect. The operator's failure to act with respect to a breach by you does not waive our right to act with respect to subsequent or similar breaches. We shall not be liable for any failure or delay in performance due to causes beyond our reasonable control, including acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, strikes, or shortages of transportation, facilities, fuel, energy, labor, or materials. These terms are written in the English language, and any translation is provided for convenience only. In the event of any conflict, the English version shall prevail.`,
  },
];

export default function LegalPage() {
  const { scrollYProgress } = useScroll();
  const fillHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <main className="min-h-screen relative">
      {/* Vertical scroll progress */}
      <div className="fixed right-5 top-1/2 -translate-y-1/2 h-[50vh] w-[3px] hidden md:block bg-white/10 z-50" style={{ borderRadius: '1px' }}>
        <motion.div
          className="absolute top-0 left-0 w-full bg-[var(--accent)]"
          style={{ height: fillHeight, borderRadius: '1px' }}
        />
        {sections.map((section, i) => (
          <div
            key={section.title}
            className="absolute left-0 w-full h-[1px] bg-white/30"
            style={{ top: `${(i / (sections.length - 1)) * 100}%` }}
          />
        ))}
      </div>

      <Header />

      <section className="max-w-4xl mx-auto px-6 pt-40 pb-20">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[10px] uppercase tracking-[0.44em] mb-5"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}
        >
          <LegalCyclingText />
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl md:text-5xl text-white tracking-[0.07em] uppercase leading-[1.1]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <GlitchyText text="LEGAL DOCUMENTATION & TERMS OF SERVICE" />
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-sm leading-7 text-white/40"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          The following documents govern your access to and use of the REPOSIGHT platform. By using this site, creating an account, or initiating a repository audit, you agree to be bound by these terms and all applicable intellectual property protections described herein. Please read these documents carefully before proceeding.
        </motion.p>
      </section>

      <div className="max-w-4xl mx-auto px-6">
        <div className="h-px bg-white/[0.08]" />
      </div>

      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="space-y-16">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              className="glass border border-white/[0.07] p-8"
              style={{ borderRadius: '1px' }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.44em] mb-4"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}
              >
                Section {String(i + 1).padStart(2, '0')}
              </p>
              <div className="w-fit">
                <h2
                  className="text-xl md:text-2xl text-white tracking-[0.08em] uppercase whitespace-nowrap"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {section.title}
                </h2>
                <div className="h-[3px] w-full mt-3 mb-5" style={{ backgroundColor: 'var(--accent)' }} />
              </div>
              {i === 0 ? (
                <div className="text-sm leading-7 text-red-400/90" style={{ fontFamily: 'var(--font-body)' }}>
                  <p>REPOSIGHT is a proprietary software platform developed, operated, and maintained by Tanishq Giri under the IMCA (Software, Game & Server Solutions) business entity. The entire codebase, including but not limited to the Next.js frontend application, the Express backend API, the Prisma database schema, the PostgreSQL data layer, all analysis algorithms, scanner integrations, user-interface designs, brand assets, documentation, and any derivative works, is the exclusive intellectual property of Tanishq Giri and IMCA. All rights are reserved worldwide and in perpetuity.</p>
                  <p className="mt-4">No individual, organization, or automated system is granted any license, express or implied, to use, reproduce, distribute, modify, decompile, reverse-engineer, translate, create derivative works from, sublicense, sell, rent, lease, or otherwise exploit any portion of the REPOSIGHT platform, its code, its architecture, or its visual identity without the prior written consent of the owner.</p>
                  <p className="mt-4">
                    <span
                      className="underline decoration-red-400/40 underline-offset-2"
                      style={{
                        animation: 'legalGlow 2.5s ease-in-out infinite',
                        textShadow: '0 0 8px rgba(255,80,80,0.3)',
                      }}
                    >
                      Any unauthorized access, reproduction, transmission, or redistribution of this platform or its underlying code is strictly prohibited and may result in civil and criminal penalties under applicable copyright, trade-secret, and computer-fraud laws.
                    </span>
                  </p>
                </div>
              ) : (
                <p
                  className="text-sm leading-7 text-white/40"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {section.content}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6">
        <div className="h-px bg-white/[0.08]" />
      </div>

      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p
          className="text-[10px] uppercase tracking-[0.44em] mb-4"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}
        >
          Effective Date
        </p>
        <p className="text-sm text-white/60" style={{ fontFamily: 'var(--font-body)' }}>
          These documents are effective as of 18 July 2026 and shall remain in effect until amended or superseded by a later version posted on this page. All prior versions are superseded by this publication.
        </p>
      </section>

      <Footer />
    </main>
  );
}
