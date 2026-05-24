export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 text-[15px] text-[#1A1D23] leading-relaxed">
      <h1 className="text-[28px] font-semibold mb-2">Terms of Service</h1>
      <p className="text-[13px] text-[#777D88] mb-8">Last updated: May 2026</p>

      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-[17px] font-semibold mb-2">1. What this service is</h2>
          <p className="text-[#444]">
            My Transit Dashboard is a personal-use web application that displays live NYC MTA
            subway and bus arrival times, service alerts, and lets you save custom station
            configurations ("dashboards"). It is provided free of charge and without warranty.
          </p>
        </div>

        <div>
          <h2 className="text-[17px] font-semibold mb-2">2. Your account</h2>
          <p className="text-[#444]">
            You may use the app without creating an account; your dashboards will be stored
            locally in your browser. Creating an account allows you to sync your dashboards
            across devices. You are responsible for keeping your login credentials secure.
          </p>
        </div>

        <div>
          <h2 className="text-[17px] font-semibold mb-2">3. Data we store</h2>
          <p className="text-[#444]">
            When you create an account we store your email address and the dashboard
            configurations you create (station names and IDs). We do not collect location data,
            payment information, or any other personal data.
          </p>
        </div>

        <div>
          <h2 className="text-[17px] font-semibold mb-2">4. Acceptable use</h2>
          <p className="text-[#444]">
            You agree not to abuse, scrape, or interfere with this service or the underlying
            MTA data feeds. This service is for personal, non-commercial use only.
          </p>
        </div>

        <div>
          <h2 className="text-[17px] font-semibold mb-2">5. Disclaimer of warranties</h2>
          <p className="text-[#444]">
            Transit arrival times are sourced from the MTA&rsquo;s real-time feeds and may be
            inaccurate or unavailable. This service is provided &ldquo;as is&rdquo; without any
            warranty. We are not responsible for any missed trains or other consequences of
            relying on this information.
          </p>
        </div>

        <div>
          <h2 className="text-[17px] font-semibold mb-2">6. Changes to these terms</h2>
          <p className="text-[#444]">
            We may update these terms from time to time. Continued use of the service after
            changes are posted constitutes acceptance of the new terms.
          </p>
        </div>
      </section>
    </main>
  );
}
