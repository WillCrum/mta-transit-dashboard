export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 text-[15px] text-[#1A1D23] leading-relaxed">
      <h1 className="text-[28px] font-semibold mb-2">Privacy Policy</h1>
      <p className="text-[13px] text-[#777D88] mb-8">Last updated: May 2026</p>

      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-[17px] font-semibold mb-2">1. What we collect</h2>
          <p className="text-[#444]">
            When you create an account, we collect your email address and the dashboard
            configurations you save (station names and IDs). We do not collect your location,
            payment information, browsing history, or any other personal data.
          </p>
        </div>

        <div>
          <h2 className="text-[17px] font-semibold mb-2">2. How we use your data</h2>
          <p className="text-[#444]">
            Your email is used solely to authenticate you and, if you chose magic-link sign-in,
            to send you a one-time login link. Your dashboard configurations are stored so you
            can access them across devices. We do not use your data for advertising or share it
            with third parties.
          </p>
        </div>

        <div>
          <h2 className="text-[17px] font-semibold mb-2">3. Where data is stored</h2>
          <p className="text-[#444]">
            Account data is stored in a Postgres database hosted by Supabase (supabase.com),
            with servers located in the United States. If you use the app without an account,
            your dashboards are stored only in your browser&rsquo;s local storage and never
            leave your device.
          </p>
        </div>

        <div>
          <h2 className="text-[17px] font-semibold mb-2">4. Third-party services</h2>
          <p className="text-[#444]">
            We use the following third-party services to operate this app:
          </p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-1 text-[#444]">
            <li><strong>Supabase</strong> — authentication and database hosting</li>
            <li><strong>MTA Real-Time Feeds</strong> — live subway and bus arrival data</li>
            <li><strong>OpenStreetMap / Komoot Photon</strong> — address and place search</li>
            <li><strong>Vercel</strong> — web hosting and edge functions</li>
          </ul>
          <p className="text-[#444] mt-2">
            None of these services receive your personal data beyond what is necessary for their
            function. Transit data queries do not include any identifying information.
          </p>
        </div>

        <div>
          <h2 className="text-[17px] font-semibold mb-2">5. Cookies and sessions</h2>
          <p className="text-[#444]">
            If you are signed in, an HttpOnly session cookie is stored in your browser to keep
            you authenticated. This cookie is not used for tracking. No other cookies are set.
          </p>
        </div>

        <div>
          <h2 className="text-[17px] font-semibold mb-2">6. Your rights</h2>
          <p className="text-[#444]">
            You may delete your account at any time via Account Settings. Deletion permanently
            removes your email address and all saved dashboards from our database. You may also
            simply stop using the service — we do not retain data beyond what is actively
            stored in your account.
          </p>
        </div>

        <div>
          <h2 className="text-[17px] font-semibold mb-2">7. Contact</h2>
          <p className="text-[#444]">
            Questions about this policy? Email{" "}
            <a href="mailto:willacrum@gmail.com" className="text-[#003DA5] underline underline-offset-2">
              willacrum@gmail.com
            </a>.
          </p>
        </div>
      </section>
    </main>
  );
}
