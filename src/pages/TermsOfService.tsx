import { Link } from "react-router-dom";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-2 text-foreground">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using this service, you accept and agree to be bound by the terms and provisions of this agreement.
              If you do not agree to these terms, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Permission is granted to temporarily access the service for personal, non-commercial use only. This license does not include:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Modifying or copying the service materials</li>
              <li>Using the service for any commercial purpose</li>
              <li>Attempting to reverse engineer any software contained in the service</li>
              <li>Removing any copyright or proprietary notations from the materials</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility
              for all activities that occur under your account. We reserve the right to terminate accounts, remove or edit content at
              our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Content</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You retain all rights to any content you submit, post or display on or through the service. By posting content, you grant
              us a worldwide, non-exclusive, royalty-free license to use, modify, and display that content in connection with the service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for all content you post and agree not to post content that is illegal, offensive, or infringes on
              intellectual property rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the service is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Prohibited Activities</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You agree not to engage in any of the following activities:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Violating any applicable laws or regulations</li>
              <li>Impersonating any person or entity</li>
              <li>Harassing, threatening, or intimidating other users</li>
              <li>Attempting to gain unauthorized access to the service or other users' accounts</li>
              <li>Distributing viruses, malware, or other harmful code</li>
              <li>Collecting or storing personal data about other users without their consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Disclaimers</h2>
            <p className="text-muted-foreground leading-relaxed">
              The service is provided "as is" without any warranties, expressed or implied. We do not warrant that the service will be
              uninterrupted, secure, or error-free. We are not responsible for any damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              In no event shall we be liable for any indirect, incidental, special, consequential, or punitive damages resulting from
              your use of or inability to use the service, even if we have been advised of the possibility of such damages.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Modifications to Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify or discontinue the service at any time without notice. We shall not be liable to you or
              any third party for any modification, suspension, or discontinuance of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to update these Terms of Service at any time. We will notify users of any material changes by
              posting the new Terms of Service on this page and updating the "Last Updated" date. Your continued use of the service
              after any changes indicates your acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to its conflict of
              law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us through our support channels.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link to="/" className="text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
