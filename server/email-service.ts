import nodemailer from "nodemailer";
import { Notification, NotificationType } from "@shared/notification-schema";

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Only initialize if SMTP credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const smtpPort = parseInt(process.env.SMTP_PORT || '587');
        const isSecure = smtpPort === 465;
        
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
          port: smtpPort,
          secure: isSecure, // true for 465, false for 587
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          // Production-optimized timeout configuration
          connectionTimeout: 30000, // 30 seconds for production
          greetingTimeout: 30000,   // 30 seconds for production
          socketTimeout: 60000,     // 60 seconds for production
          
          // Enhanced SSL/TLS configuration for production
          ...(smtpPort === 465 && {
            tls: {
              rejectUnauthorized: false,
              ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256'
            }
          }),
          
          // Fix SSL/TLS issues for port 587
          ...(smtpPort === 587 && {
            tls: {
              rejectUnauthorized: false,
              ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256'
            },
            requireTLS: true,
            ignoreTLS: false
          }),
          
          // Debug logging for production troubleshooting
          debug: process.env.NODE_ENV === 'production',
          logger: process.env.NODE_ENV === 'production'
        });
        console.log('Email service initialized successfully');
        
        // Test connection in production
        if (process.env.NODE_ENV === 'production') {
          this.testConnection();
        }
      } catch (error) {
        console.error('Failed to initialize email service:', error);
        this.transporter = null;
      }
    } else {
      console.log('Email service not initialized - SMTP credentials not configured');
      this.transporter = null;
    }
  }

  // Professional unified email template
  private generateEmailTemplate(data: {
    title: string;
    content: string;
    ctaText?: string;
    ctaUrl?: string;
    showLogo?: boolean;
  }) {
    const logoSection = data.showLogo !== false ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${process.env.LOGO_URL || 'https://tinhih.org/wp-content/uploads/2024/01/tinhih-logo.png'}" 
             alt="TiNHiH Logo" 
             style="height: 60px; width: auto; max-width: 200px;">
      </div>
    ` : '';

    const ctaButton = data.ctaText && data.ctaUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.ctaUrl}" 
           style="display: inline-block; padding: 14px 28px; background-color: #ffdd00; color: #000000; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          ${data.ctaText}
        </a>
      </div>
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${data.title} - TiNHiH Portal</title>
        <style>
          /* Reset styles */
          body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
          
          /* Base styles */
          body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #f4f4f4 !important;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
            font-size: 16px;
            line-height: 1.6;
            color: #4a4a4a;
          }
          
          /* Container */
          .email-container {
            max-width: 600px !important;
            margin: 0 auto !important;
            background-color: #ffffff !important;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          /* Header */
          .email-header {
            background: linear-gradient(135deg, #ffdd00 0%, #ffed4e 100%);
            padding: 40px 30px;
            text-align: center;
            border-bottom: 3px solid #e6c800;
          }
          
          .email-header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
            color: #000000;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          
          .email-header p {
            margin: 0;
            font-size: 18px;
            font-weight: 500;
            color: #333333;
          }
          
          /* Content */
          .email-content {
            padding: 40px 30px;
            background-color: #ffffff;
          }
          
          .email-content p {
            margin: 0 0 20px 0;
            font-size: 16px;
            line-height: 1.6;
            color: #4a4a4a;
          }
          
          .email-content h2 {
            margin: 0 0 20px 0;
            font-size: 24px;
            font-weight: 600;
            color: #2c2c2c;
          }
          
          .email-content h3 {
            margin: 0 0 15px 0;
            font-size: 20px;
            font-weight: 600;
            color: #2c2c2c;
          }
          
          /* Footer */
          .email-footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
          }
          
          .email-footer p {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #6c757d;
            line-height: 1.4;
          }
          
          .email-footer .team-signature {
            font-weight: 600;
            color: #495057;
            margin-bottom: 15px !important;
          }
          
          .email-footer .foundation-note {
            font-style: italic;
            color: #6c757d;
            font-size: 13px;
          }
          
          /* Responsive */
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
              border-radius: 0 !important;
            }
            
            .email-header,
            .email-content,
            .email-footer {
              padding: 20px 15px !important;
            }
            
            .email-header h1 {
              font-size: 24px !important;
            }
            
            .email-header p {
              font-size: 16px !important;
            }
          }
        </style>
      </head>
      <body>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-container">
                <!-- Header -->
                <tr>
                  <td class="email-header">
                    ${logoSection}
                    <h1>${data.title}</h1>
                    <p>TiNHiH Portal</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td class="email-content">
                    ${data.content}
                    ${ctaButton}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td class="email-footer">
                    <p class="team-signature">- TiNHiH Team</p>
                    <p class="foundation-note">A concern of "TiNHiH Foundation"</p>
                    <p>© ${new Date().getFullYear()} TiNHiH Portal. All rights reserved.</p>
                    <p>This is an automated email. Please do not reply to this message.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
${data.title} - TiNHiH Portal

${data.content.replace(/<[^>]*>/g, '')}

${data.ctaText && data.ctaUrl ? `${data.ctaText}: ${data.ctaUrl}` : ''}

- TiNHiH Team
A concern of "TiNHiH Foundation"

© ${new Date().getFullYear()} TiNHiH Portal. All rights reserved.
This is an automated email. Please do not reply to this message.
    `;

    return { html, text };
  }

  // Send message notification email
  async sendMessageNotification(data: {
    to: string;
    recipientName: string;
    senderName: string;
    senderRole: string;
    messageSubject: string;
    messageContent: string;
    messageType: string;
    appointmentDetails?: any;
    portalUrl: string;
    isUrgent?: boolean;
    isNewConversation?: boolean;
  }): Promise<boolean> {
    if (!this.transporter) {
      console.log(`Email not sent - SMTP not configured. Message notification for: ${data.to}`);
      return false;
    }

    try {
      const emailContent = this.generateMessageNotificationEmail(data);

      const mailOptions = {
        from: `"TiNHiH Portal" <${process.env.SMTP_USER}>`,
        to: data.to,
        subject: data.isUrgent ? `🚨 URGENT: ${data.messageSubject}` : `New Message: ${data.messageSubject}`,
        html: emailContent.html,
        text: emailContent.text,
      };

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout')), 15000); // 15 second timeout
      });

      const sendPromise = this.transporter.sendMail(mailOptions);
      
      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      console.log(`Message notification email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('Failed to send message notification email:', error);
      // Don't throw error - just return false to indicate failure
      return false;
    }
  }

  // Send notification email
  async sendNotificationEmail(
    to: string,
    notification: Notification,
    userFirstName?: string
  ): Promise<boolean> {
    if (!this.transporter) {
      console.log(`Email not sent - SMTP not configured. Notification: ${notification.id}`);
      return false;
    }

    try {
      const emailContent = this.generateNotificationEmail(notification, userFirstName);

      const mailOptions = {
        from: `"TiNHiH Portal" <${process.env.FROM_EMAIL}>`,
        to: to,
        subject: `TiNHiH Portal: ${notification.title}`,
        html: emailContent.html,
        text: emailContent.text,
      };

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout')), 15000); // 15 second timeout
      });

      const sendPromise = this.transporter.sendMail(mailOptions);
      
      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      console.log(`Notification email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('Failed to send notification email:', error);
      // Don't throw error - just return false to indicate failure
      return false;
    }
  }

  // Generate message notification email content
  private generateMessageNotificationEmail(data: {
    recipientName: string;
    senderName: string;
    senderRole: string;
    messageSubject: string;
    messageContent: string;
    messageType: string;
    appointmentDetails?: any;
    portalUrl: string;
    isUrgent?: boolean;
    isNewConversation?: boolean;
  }) {
    const messageTypeDisplay = data.messageType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const conversationType = data.isNewConversation ? 'new conversation' : 'message';

    const urgentBadge = data.isUrgent ? `
      <div style="background: #dc3545; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-weight: bold; font-size: 16px;">
        🚨 URGENT MESSAGE - IMMEDIATE ATTENTION REQUIRED 🚨
      </div>
    ` : '';

    const appointmentSection = data.appointmentDetails ? `
      <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db;">
        <h4 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;">📅 Linked Appointment</h4>
        <p style="margin: 8px 0;"><strong>Title:</strong> ${data.appointmentDetails.title}</p>
        <p style="margin: 8px 0;"><strong>Date:</strong> ${new Date(data.appointmentDetails.appointmentDate).toLocaleDateString()}</p>
        <p style="margin: 8px 0;"><strong>Time:</strong> ${new Date(data.appointmentDetails.appointmentDate).toLocaleTimeString()}</p>
      </div>
    ` : '';

    const content = `
      ${urgentBadge}
      
      <p>Hello <strong>${data.recipientName}</strong>,</p>
      
      <p>You have received a ${data.isUrgent ? '<strong style="color: #dc3545;">URGENT</strong> ' : ''}${conversationType} from <strong>${data.senderName}</strong> (${data.senderRole}).</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffdd00;">
        <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;">Message Details</h3>
        <p style="margin: 8px 0;"><strong>From:</strong> ${data.senderName} (${data.senderRole})</p>
        <p style="margin: 8px 0;"><strong>Subject:</strong> ${data.messageSubject}</p>
        <p style="margin: 8px 0;"><strong>Type:</strong> <span style="display: inline-block; padding: 4px 8px; background: #ffdd00; color: #000; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">${messageTypeDisplay}</span></p>
      </div>
      
      <div style="background: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e9ecef;">
        <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;">Message Content</h3>
        <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${data.messageContent}</p>
      </div>
      
      ${appointmentSection}
      
      <p style="font-size: 14px; color: #6c757d; margin-top: 20px;">
        This message was sent through the TiNHiH Portal messaging system. 
        Please log in to your portal account to respond to this message.
      </p>
    `;

    return this.generateEmailTemplate({
      title: data.isUrgent ? '🚨 URGENT Message' : '💬 New Message',
      content: content,
      ctaText: '📱 View Message in Portal',
      ctaUrl: data.portalUrl,
      showLogo: true
    });
  }



  // Generate email content based on notification type
  private generateNotificationEmail(notification: Notification, userFirstName?: string) {
    const greeting = userFirstName ? `Hello ${userFirstName},` : 'Hello,';

    const priorityColors = {
      urgent: '#dc3545',
      high: '#fd7e14',
      medium: '#ffdd00',
      low: '#28a745'
    };

    const content = `
      <p>${greeting}</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${priorityColors[notification.priority as keyof typeof priorityColors] || '#ffdd00'};">
        <div style="margin-bottom: 15px;">
          <span style="display: inline-block; padding: 4px 8px; background: ${priorityColors[notification.priority as keyof typeof priorityColors] || '#ffdd00'}; color: ${notification.priority === 'low' ? '#000' : '#fff'}; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">${notification.priority}</span>
          <span style="color: #6c757d; font-size: 12px; margin-left: 10px;">${new Date(notification.createdAt).toLocaleString()}</span>
        </div>
        
        <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;">${notification.title}</h3>
        <p style="margin: 0; color: #4a4a4a; line-height: 1.6;">${notification.message}</p>
        
        ${notification.actionUrl ? `
          <div style="margin-top: 20px;">
            <a href="${notification.actionUrl}" style="display: inline-block; padding: 10px 20px; background: #ffdd00; color: #000; text-decoration: none; border-radius: 6px; font-weight: 600;">View Details</a>
          </div>
        ` : ''}
      </div>
      
      <p style="font-size: 14px; color: #6c757d;">
        You can manage your notification preferences in your account settings.
      </p>
    `;

    return this.generateEmailTemplate({
      title: '🔔 Notification',
      content: content,
      ctaText: notification.actionUrl ? 'View Details' : undefined,
      ctaUrl: notification.actionUrl || undefined,
      showLogo: true
    });
  }



  // Send appointment reminder email
  async sendAppointmentReminder(
    to: string,
    appointmentData: any,
    userFirstName?: string
  ): Promise<boolean> {
    if (!this.transporter) {
      console.log(`Appointment reminder email not sent - SMTP not configured. Appointment: ${appointmentData.id}`);
      return false;
    }

    try {
      const greeting = userFirstName ? `Hello ${userFirstName},` : 'Hello,';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Reminder - TiNHiH Portal</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .appointment-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #fd7e14; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Reminder</h1>
              <p>TiNHiH Portal</p>
            </div>
            
            <div class="content">
              <p>${greeting}</p>
              
              <div class="appointment-card">
                <h2 style="margin: 0 0 15px 0; color: #333;">Appointment Reminder</h2>
                
                <p><strong>Appointment:</strong> ${appointmentData.title}</p>
                <p><strong>Date:</strong> ${new Date(appointmentData.appointmentDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${appointmentData.startTime} - ${appointmentData.endTime}</p>
                ${appointmentData.practitioner ? `<p><strong>With:</strong> Dr. ${appointmentData.practitioner.user.firstName} ${appointmentData.practitioner.user.lastName}</p>` : ''}
                ${appointmentData.notes ? `<p><strong>Notes:</strong> ${appointmentData.notes}</p>` : ''}
                
                <div style="margin-top: 20px;">
                  <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/calendar" class="btn">View Calendar</a>
                </div>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                If you need to reschedule or cancel this appointment, please contact your healthcare provider.
              </p>
            </div>
            
            <div class="footer">
              <p>This is an automated reminder from TiNHiH Portal.</p>
              <p>If you have any questions, please contact your healthcare provider.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
Appointment Reminder - TiNHiH Portal

${greeting}

You have an upcoming appointment:

Appointment: ${appointmentData.title}
Date: ${new Date(appointmentData.appointmentDate).toLocaleDateString()}
Time: ${appointmentData.startTime} - ${appointmentData.endTime}
${appointmentData.practitioner ? `With: Dr. ${appointmentData.practitioner.user.firstName} ${appointmentData.practitioner.user.lastName}` : ''}
${appointmentData.notes ? `Notes: ${appointmentData.notes}` : ''}

View Calendar: ${process.env.CLIENT_URL || 'http://localhost:3000'}/calendar

If you need to reschedule or cancel this appointment, please contact your healthcare provider.

---
This is an automated reminder from TiNHiH Portal.
      `;

      const mailOptions = {
        from: `"TiNHiH Portal" <${process.env.FROM_EMAIL}>`,
        to: to,
        subject: `Appointment Reminder: ${appointmentData.title}`,
        html: html,
        text: text,
      };

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout')), 15000); // 15 second timeout
      });

      const sendPromise = this.transporter.sendMail(mailOptions);
      
      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      console.log(`Appointment reminder email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('Failed to send appointment reminder email:', error);
      return false;
    }
  }

  // Send appointment confirmation email
  async sendAppointmentConfirmationEmail(
    to: string,
    appointmentData: {
      patientName: string;
      practitionerName: string;
      appointmentDate: string;
      appointmentType: string;
      duration: number;
      locationType: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      telehealthPlatform?: string;
    }
  ): Promise<boolean> {
    if (!this.transporter) {
      console.log(`Email not sent - SMTP not configured. Appointment confirmation for: ${to}`);
      return false;
    }

    try {
      const greeting = `Hello,`;

      const locationInfo = appointmentData.locationType === 'telehealth'
        ? `<p><strong>Platform:</strong> ${appointmentData.telehealthPlatform || 'In-App Video'}</p>`
        : `<p><strong>Address:</strong> ${appointmentData.address}, ${appointmentData.city}, ${appointmentData.state} ${appointmentData.zipCode}</p>`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Confirmation - TiNHiH Portal</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">
          
          <h1>Appointment Confirmed</h1>
          
          <p>${greeting}</p>
          
          <h2>Appointment Details</h2>
          
          <p><strong>Patient:</strong> ${appointmentData.patientName}</p>
          <p><strong>Practitioner:</strong> ${appointmentData.practitionerName}</p>
          <p><strong>Date & Time:</strong> ${appointmentData.appointmentDate}</p>
          <p><strong>Type:</strong> ${appointmentData.appointmentType}</p>
          <p><strong>Duration:</strong> ${appointmentData.duration} minutes</p>
          <p><strong>Location:</strong> ${appointmentData.locationType === 'telehealth' ? 'Telehealth' : 'In-Person'}</p>
          ${locationInfo}
          
          <p style="margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/calendar" 
               style="background: #ffdd00; 
                      color: #000; padding: 12px 24px; text-decoration: none; 
                      border-radius: 4px; display: inline-block; font-weight: bold;">
              View Calendar
            </a>
          </p>
          
          <p>Your appointment has been successfully scheduled. Please arrive 10 minutes early for in-person appointments.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ccc;">
          
          <p style="color: #666; font-size: 12px;">
            This is an automated confirmation from TiNHiH Portal.<br>
            If you need to reschedule or cancel this appointment, please contact your healthcare provider.
          </p>
          
        </body>
        </html>
      `;

      const text = `
Appointment Confirmation - TiNHiH Portal

${greeting}

Your appointment has been successfully scheduled:

Patient: ${appointmentData.patientName}
Practitioner: ${appointmentData.practitionerName}
Date & Time: ${appointmentData.appointmentDate}
Type: ${appointmentData.appointmentType}
Duration: ${appointmentData.duration} minutes
Location: ${appointmentData.locationType === 'telehealth' ? 'Telehealth' : 'In-Person'}
${appointmentData.locationType === 'telehealth' ? `Platform: ${appointmentData.telehealthPlatform || 'In-App Video'}` : `Address: ${appointmentData.address}, ${appointmentData.city}, ${appointmentData.state} ${appointmentData.zipCode}`}

View Calendar: ${process.env.CLIENT_URL || 'http://localhost:3000'}/calendar

Your appointment has been successfully scheduled. Please arrive 10 minutes early for in-person appointments.

---
This is an automated confirmation from TiNHiH Portal.
      `;

      const mailOptions = {
        from: `"TiNHiH Portal" <${process.env.FROM_EMAIL}>`,
        to: to,
        subject: `Appointment Confirmation - ${appointmentData.appointmentDate}`,
        html: html,
        text: text,
      };

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout')), 15000); // 15 second timeout
      });

      const sendPromise = this.transporter.sendMail(mailOptions);
      
      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      console.log(`Appointment confirmation email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('Failed to send appointment confirmation email:', error);
      return false;
    }
  }

  // Send invoice email
  async sendInvoiceEmail(data: {
    to: string;
    recipientName: string;
    invoice: any;
    customMessage?: string;
    portalUrl: string;
  }): Promise<boolean> {
    if (!this.transporter) {
      console.log(`Invoice email not sent - SMTP not configured. Invoice: ${data.invoice.invoiceNumber}`);
      return false;
    }

    try {
      const emailContent = this.generateInvoiceEmail(data);

      const mailOptions = {
        from: `"TiNHiH Portal" <${process.env.FROM_EMAIL}>`,
        to: data.to,
        subject: `Service Bill ${data.invoice.invoiceNumber} from TiNHiH Portal`,
        html: emailContent.html,
        text: emailContent.text,
      };

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout')), 15000); // 15 second timeout
      });

      const sendPromise = this.transporter.sendMail(mailOptions);
      
      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      console.log(`Invoice email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('Failed to send invoice email:', error);
      return false;
    }
  }

  // Generate invoice email content
  private generateInvoiceEmail(data: {
    recipientName: string;
    invoice: any;
    customMessage?: string;
    portalUrl: string;
  }) {
    const invoice = data.invoice;
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Not specified';
    const createdDate = new Date(invoice.createdAt).toLocaleDateString();

    const statusBadge = (() => {
      switch (invoice.status) {
        case 'paid':
          return '<span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">PAID</span>';
        case 'overdue':
          return '<span style="background: #dc3545; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">OVERDUE</span>';
        case 'pending':
          return '<span style="background: #fd7e14; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">PENDING</span>';
        default:
          return '<span style="background: #6c757d; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">DRAFT</span>';
      }
    })();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Service Bill ${invoice.invoiceNumber} - TiNHiH Portal</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #ffdd00 0%, #ffed4e 100%); color: #000; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .invoice-card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffdd00; }
          .invoice-details { background: #e8f4fd; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .btn { display: inline-block; padding: 12px 24px; background: #ffdd00; color: #000; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f8f9fa; }
          .amount { font-size: 24px; font-weight: bold; color: #2c3e50; }
          .service-description { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #dee2e6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">💰 Service Bill</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">TiNHiH Portal</p>
          </div>
          
          <div class="content">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${data.recipientName}</strong>,</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">Please find attached your service bill from TiNHiH Portal.</p>
            
            <div class="invoice-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #2c3e50;">Invoice #${invoice.invoiceNumber}</h2>
                ${statusBadge}
              </div>
              
              <div class="invoice-details">
                <p style="margin: 5px 0;"><strong>Client:</strong> ${invoice.patient?.user?.firstName} ${invoice.patient?.user?.lastName}</p>
                <p style="margin: 5px 0;"><strong>Recovery Specialist:</strong> ${invoice.practitioner?.user?.firstName} ${invoice.practitioner?.user?.lastName}</p>
                <p style="margin: 5px 0;"><strong>Created:</strong> ${createdDate}</p>
                <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDate}</p>
                ${invoice.appointment ? `<p style="margin: 5px 0;"><strong>Linked Session:</strong> ${invoice.appointment.title}</p>` : ''}
              </div>
              
              <div class="service-description">
                <h3 style="margin: 0 0 10px 0; color: #2c3e50;">Service Description:</h3>
                <p style="margin: 0; white-space: pre-wrap;">${invoice.description}</p>
              </div>
              
              <div style="text-align: right; margin-top: 20px;">
                <p style="margin: 5px 0;"><strong>Service Amount:</strong> $${parseFloat(invoice.amount).toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>Tax:</strong> $${parseFloat(invoice.tax || '0').toFixed(2)}</p>
                <div style="border-top: 2px solid #dee2e6; padding-top: 10px; margin-top: 10px;">
                  <p style="margin: 0; font-size: 18px;"><strong>Total Amount:</strong> <span class="amount">$${parseFloat(invoice.total).toFixed(2)}</span></p>
                </div>
              </div>
            </div>
            
            ${data.customMessage ? `
              <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #ffc107;">
                <h4 style="margin: 0 0 10px 0; color: #856404;">📝 Additional Message:</h4>
                <p style="margin: 0; color: #856404;">${data.customMessage}</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.portalUrl}" class="btn">💳 View & Pay Bill</a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              This service bill was generated through the TiNHiH Portal billing system. 
              You can view and pay this bill by clicking the button above or logging into your portal account.
            </p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} TiNHiH Portal. All rights reserved.</p>
            <p>This is an automated service bill from TiNHiH Portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Service Bill ${invoice.invoiceNumber} - TiNHiH Portal

Hello ${data.recipientName},

Please find attached your service bill from TiNHiH Portal.

Invoice #${invoice.invoiceNumber} - Status: ${invoice.status.toUpperCase()}

Client: ${invoice.patient?.user?.firstName} ${invoice.patient?.user?.lastName}
Recovery Specialist: ${invoice.practitioner?.user?.firstName} ${invoice.practitioner?.user?.lastName}
Created: ${createdDate}
Due Date: ${dueDate}
${invoice.appointment ? `Linked Session: ${invoice.appointment.title}` : ''}

Service Description:
${invoice.description}

Service Amount: $${parseFloat(invoice.amount).toFixed(2)}
Tax: $${parseFloat(invoice.tax || '0').toFixed(2)}
Total Amount: $${parseFloat(invoice.total).toFixed(2)}

${data.customMessage ? `
Additional Message:
${data.customMessage}
` : ''}

View & Pay Bill: ${data.portalUrl}

This service bill was generated through the TiNHiH Portal billing system. 
You can view and pay this bill by clicking the link above or logging into your portal account.

© ${new Date().getFullYear()} TiNHiH Portal. All rights reserved.
    `;

    return { html, text };
  }

  // Test email service
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service connection test failed:', error);
      return false;
    }
  }

  // Send staff welcome email
  async sendStaffWelcomeEmail(data: {
    to: string;
    recipientName: string;
    tempPassword: string;
    department: string;
    position: string;
    portalUrl: string;
  }): Promise<boolean> {
    if (!this.transporter) {
      console.log(`Email not sent - SMTP not configured. Staff welcome email for: ${data.to}`);
      return false;
    }

    try {
      const emailContent = this.generateStaffWelcomeEmail(data);

      const mailOptions = {
        from: `"TiNHiH Portal" <${process.env.FROM_EMAIL}>`,
        to: data.to,
        subject: `Welcome to TiNHiH Portal - Your Staff Account`,
        html: emailContent.html,
        text: emailContent.text,
      };

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout')), 15000); // 15 second timeout
      });

      const sendPromise = this.transporter.sendMail(mailOptions);
      
      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      console.log(`Staff welcome email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('Failed to send staff welcome email:', error);
      return false;
    }
  }

  // Generate staff welcome email content
  private generateStaffWelcomeEmail(data: {
    recipientName: string;
    tempPassword: string;
    department: string;
    position: string;
    portalUrl: string;
  }) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to TiNHiH Portal</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ffdd00; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
          .btn { display: inline-block; background: #ffdd00; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .password-box { background: #f8f9fa; border: 2px solid #ffdd00; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center; }
          .important { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #000;">🎉 Welcome to TiNHiH Portal</h1>
            <p style="margin: 10px 0 0 0; color: #000;">Your Staff Account is Ready</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.recipientName}!</h2>
            
            <p>Welcome to the TiNHiH Portal team! Your staff account has been created and you're now ready to access the portal.</p>
            
            <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #155724;">📋 Your Account Details:</h3>
              <p style="margin: 5px 0;"><strong>Department:</strong> ${data.department}</p>
              <p style="margin: 5px 0;"><strong>Position:</strong> ${data.position}</p>
              <p style="margin: 5px 0;"><strong>Role:</strong> Staff Member</p>
            </div>
            
            <div class="password-box">
              <h3 style="margin: 0 0 10px 0;">🔐 Your Temporary Password</h3>
              <p style="margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 2px;">${data.tempPassword}</p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">If the password is not working, please reset it via forgot password</p>
            </div>
            
            <div class="important">
              <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Important Security Notice:</h4>
              <ul style="margin: 0; padding-left: 20px;">
                <li>This is a temporary password that must be changed on your first login</li>
                <li>Do not share your password with anyone</li>
                <li>Use a strong, unique password for your account</li>
                <li>Contact your administrator if you have any issues</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.portalUrl}/login" class="btn">🚀 Login to Portal</a>
            </div>
            
            <h3>What You Can Do:</h3>
            <ul>
              <li>Access the TiNHiH Portal dashboard</li>
              <li>View and manage patient information</li>
              <li>Handle appointments and scheduling</li>
              <li>Process billing and payments</li>
              <li>Generate reports and analytics</li>
            </ul>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              If you have any questions or need assistance, please contact your administrator or the TiNHiH Portal support team.
            </p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} TiNHiH Portal. All rights reserved.</p>
            <p>This is an automated welcome email from TiNHiH Portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to TiNHiH Portal - Your Staff Account

Hello ${data.recipientName}!

Welcome to the TiNHiH Portal team! Your staff account has been created and you're now ready to access the portal.

Your Account Details:
- Department: ${data.department}
- Position: ${data.position}
- Role: Staff Member

Your Temporary Password: ${data.tempPassword}
(If the password is not working, please reset it via forgot password)

Important Security Notice:
- This is a temporary password that must be changed on your first login
- Do not share your password with anyone
- Use a strong, unique password for your account
- Contact your administrator if you have any issues

Login to Portal: ${data.portalUrl}/login

What You Can Do:
- Access the TiNHiH Portal dashboard
- View and manage patient information
- Handle appointments and scheduling
- Process billing and payments
- Generate reports and analytics

If you have any questions or need assistance, please contact your administrator or the TiNHiH Portal support team.

© ${new Date().getFullYear()} TiNHiH Portal. All rights reserved.
    `;

    return { html, text };
  }

  async sendPractitionerWelcomeEmail(data: {
    to: string;
    recipientName: string;
    tempPassword: string;
    specialty: string;
    portalUrl: string;
  }): Promise<boolean> {
    try {
      const emailContent = this.generatePractitionerWelcomeEmail(data);

      const mailOptions = {
        from: `"TiNHiH Portal" <${process.env.FROM_EMAIL || 'noreply@tinhih.com'}>`,
        to: data.to,
        subject: 'Welcome to TiNHiH Portal - Recovery Specialist Account',
        html: emailContent.html,
        text: emailContent.text
      };

      if (!this.transporter) {
        console.error('Email transporter not initialized');
        return false;
      }
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout')), 15000); // 15 second timeout
      });

      const sendPromise = this.transporter.sendMail(mailOptions);
      
      await Promise.race([sendPromise, timeoutPromise]);
      console.log(`Practitioner welcome email sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send practitioner welcome email:', error);
      return false;
    }
  }

  async sendAdminWelcomeEmail(data: {
    to: string;
    recipientName: string;
    tempPassword: string;
    department: string | null;
    position: string | null;
    portalUrl: string;
  }): Promise<boolean> {
    try {
      const emailContent = this.generateAdminWelcomeEmail(data);

      const mailOptions = {
        from: `"TiNHiH Portal" <${process.env.FROM_EMAIL || 'noreply@tinhih.com'}>`,
        to: data.to,
        subject: 'Welcome to TiNHiH Portal - Administrator Account',
        html: emailContent.html,
        text: emailContent.text
      };

      if (!this.transporter) {
        console.error('Email transporter not initialized');
        return false;
      }
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout')), 15000); // 15 second timeout
      });

      const sendPromise = this.transporter.sendMail(mailOptions);
      
      await Promise.race([sendPromise, timeoutPromise]);
      console.log(`Admin welcome email sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send admin welcome email:', error);
      return false;
    }
  }

  async sendPatientWelcomeEmail(data: {
    to: string;
    recipientName: string;
    tempPassword: string;
    portalUrl: string;
  }): Promise<boolean> {
    try {
      const emailContent = this.generatePatientWelcomeEmail(data);

      const mailOptions = {
        from: `"TiNHiH Portal" <${process.env.FROM_EMAIL || 'noreply@tinhih.com'}>`,
        to: data.to,
        subject: 'Welcome to TiNHiH Portal - Your Patient Account',
        html: emailContent.html,
        text: emailContent.text
      };

      if (!this.transporter) {
        console.error('Email transporter not initialized');
        return false;
      }
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout')), 15000); // 15 second timeout
      });

      const sendPromise = this.transporter.sendMail(mailOptions);
      
      await Promise.race([sendPromise, timeoutPromise]);
      console.log(`Patient welcome email sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send patient welcome email:', error);
      return false;
    }
  }

  private generateAdminWelcomeEmail(data: {
    recipientName: string;
    tempPassword: string;
    department: string | null;
    position: string | null;
    portalUrl: string;
  }) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to TiNHiH Portal - Administrator</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; }
          .header { background: #ffdd00; padding: 30px; text-align: center; }
          .content { background: white; padding: 30px; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .btn { display: inline-block; padding: 12px 24px; background: #ffdd00; color: #000; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .password-box { background: #f8f9fa; border: 2px solid #ffdd00; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0; }
          .important { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0; }
          .role-details { background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #000;">🎉 Welcome to TiNHiH Portal</h1>
            <p style="margin: 10px 0 0 0; color: #000;">Your Administrator Account is Ready</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.recipientName}!</h2>
            
            <p>Welcome to the TiNHiH Portal team! Your administrator account has been created and you now have full access to manage the system and support our recovery mission.</p>
            
            <div class="role-details">
              <h3 style="margin: 0 0 10px 0; color: #155724;">📋 Your Account Details:</h3>
              <p style="margin: 5px 0;"><strong>Role:</strong> System Administrator</p>
              ${data.department ? `<p style="margin: 5px 0;"><strong>Department:</strong> ${data.department}</p>` : ''}
              ${data.position ? `<p style="margin: 5px 0;"><strong>Position:</strong> ${data.position}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Organization:</strong> TiNHiH - There is No Hero in Heroin</p>
            </div>
            
            <div class="password-box">
              <h3 style="margin: 0 0 10px 0;">🔐 Your Temporary Password</h3>
              <p style="margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 2px;">${data.tempPassword}</p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">If the password is not working, please reset it via forgot password</p>
            </div>
            
            <div class="important">
              <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Important Security Notice:</h4>
              <ul style="margin: 0; padding-left: 20px;">
                <li>This is a temporary password that must be changed on your first login</li>
                <li>Do not share your password with anyone</li>
                <li>Use a strong, unique password for your account</li>
                <li>Maintain system security and client confidentiality</li>
                <li>Contact the system administrator if you have any issues</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.portalUrl}/login" class="btn">🚀 Login to Portal</a>
            </div>
            
            <h3>What You Can Do:</h3>
            <ul>
              <li>Manage all system users (staff, practitioners, patients)</li>
              <li>Create and manage staff and practitioner accounts</li>
              <li>Access the Admin Panel for system management</li>
              <li>View and manage all transactions and billing</li>
              <li>Monitor system activity and generate reports</li>
              <li>Manage system settings and configurations</li>
              <li>Oversee client care and recovery programs</li>
              <li>Handle quotes and events management</li>
            </ul>
            
            <h3>Your Responsibilities:</h3>
            <ul>
              <li>Ensure system security and data protection</li>
              <li>Manage user access and permissions</li>
              <li>Monitor system performance and resolve issues</li>
              <li>Support staff and practitioners in their roles</li>
              <li>Maintain compliance with healthcare regulations</li>
              <li>Oversee the overall success of TiNHiH's mission</li>
            </ul>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              If you have any questions or need assistance, please contact the system administrator or the TiNHiH Portal support team.
            </p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} TiNHiH Portal. All rights reserved.</p>
            <p>This is an automated welcome email from TiNHiH Portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to TiNHiH Portal - Administrator Account

Hello ${data.recipientName}!

Welcome to the TiNHiH Portal team! Your administrator account has been created and you now have full access to manage the system and support our recovery mission.

Your Account Details:
- Role: System Administrator
${data.department ? `- Department: ${data.department}` : ''}
${data.position ? `- Position: ${data.position}` : ''}
- Organization: TiNHiH - There is No Hero in Heroin

Your Temporary Password: ${data.tempPassword}
If the password is not working, please reset it via forgot password.

Important Security Notice:
- This is a temporary password that must be changed on your first login
- Do not share your password with anyone
- Use a strong, unique password for your account
- Maintain system security and client confidentiality
- Contact the system administrator if you have any issues

Login to Portal: ${data.portalUrl}/login

What You Can Do:
- Manage all system users (staff, practitioners, patients)
- Create and manage staff and practitioner accounts
- Access the Admin Panel for system management
- View and manage all transactions and billing
- Monitor system activity and generate reports
- Manage system settings and configurations
- Oversee client care and recovery programs
- Handle quotes and events management

Your Responsibilities:
- Ensure system security and data protection
- Manage user access and permissions
- Monitor system performance and resolve issues
- Support staff and practitioners in their roles
- Maintain compliance with healthcare regulations
- Oversee the overall success of TiNHiH's mission

If you have any questions or need assistance, please contact the system administrator or the TiNHiH Portal support team.

© ${new Date().getFullYear()} TiNHiH Portal. All rights reserved.
This is an automated welcome email from TiNHiH Portal.
    `;

    return { html, text };
  }

  private generatePatientWelcomeEmail(data: {
    recipientName: string;
    tempPassword: string;
    portalUrl: string;
  }) {
    const content = `
      <p>Hello <strong>${data.recipientName}</strong>,</p>
      
      <p>Welcome to TiNHiH Portal! Your patient account has been created and you now have access to our comprehensive recovery support system.</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffdd00;">
        <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;">🔐 Your Login Credentials</h3>
        <p style="margin: 8px 0;"><strong>Email:</strong> Use the email address you provided during registration</p>
        <p style="margin: 8px 0;"><strong>Temporary Password:</strong> <span style="font-family: monospace; font-weight: bold; background: #fff; padding: 4px 8px; border-radius: 4px; border: 1px solid #ddd;">${data.tempPassword}</span></p>
        <p style="margin: 15px 0 0 0; font-size: 14px; color: #6c757d;">
          <strong>Important:</strong> This is a temporary password. You will be prompted to change it on your first login for security.
        </p>
      </div>
      
      <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #155724; font-size: 18px;">🎯 What You Can Do:</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Schedule appointments with recovery specialists</li>
          <li>Access your medical records and recovery notes</li>
          <li>Send messages to your care team</li>
          <li>Join telehealth sessions for remote consultations</li>
          <li>View and manage your billing information</li>
          <li>Track your recovery progress and milestones</li>
          <li>Access educational resources and support materials</li>
        </ul>
      </div>
      
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #856404; font-size: 18px;">🔒 Security & Privacy:</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Your information is protected with industry-standard security</li>
          <li>All communications are encrypted and confidential</li>
          <li>Only authorized staff can access your records</li>
          <li>You control who can view your information</li>
        </ul>
      </div>
      
      <p style="font-size: 14px; color: #6c757d; margin-top: 20px;">
        If you have any questions or need assistance, please don't hesitate to contact your recovery specialist or the TiNHiH support team.
      </p>
    `;

    return this.generateEmailTemplate({
      title: 'Welcome to TiNHiH Portal',
      content: content,
      ctaText: '🚀 Login to Your Portal',
      ctaUrl: `${data.portalUrl}/login`,
      showLogo: true
    });
  }

  private generatePractitionerWelcomeEmail(data: {
    recipientName: string;
    tempPassword: string;
    specialty: string;
    portalUrl: string;
  }) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to TiNHiH Portal - Recovery Specialist</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; }
          .header { background: #ffdd00; padding: 30px; text-align: center; }
          .content { background: white; padding: 30px; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .btn { display: inline-block; padding: 12px 24px; background: #ffdd00; color: #000; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .password-box { background: #f8f9fa; border: 2px solid #ffdd00; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0; }
          .important { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0; }
          .role-details { background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #000;">🎉 Welcome to TiNHiH Portal</h1>
            <p style="margin: 10px 0 0 0; color: #000;">Your Recovery Specialist Account is Ready</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.recipientName}!</h2>
            
            <p>Welcome to the TiNHiH Portal team! Your recovery specialist account has been created and you're now ready to help clients on their recovery journey.</p>
            
            <div class="role-details">
              <h3 style="margin: 0 0 10px 0; color: #155724;">📋 Your Account Details:</h3>
              <p style="margin: 5px 0;"><strong>Role:</strong> Recovery Specialist</p>
              <p style="margin: 5px 0;"><strong>Specialty:</strong> ${data.specialty}</p>
              <p style="margin: 5px 0;"><strong>Organization:</strong> TiNHiH - There is No Hero in Heroin</p>
            </div>
            
            <div class="password-box">
              <h3 style="margin: 0 0 10px 0;">🔐 Your Temporary Password</h3>
              <p style="margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 2px;">${data.tempPassword}</p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">If the password is not working, please reset it via forgot password</p>
            </div>
            
            <div class="important">
              <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Important Security Notice:</h4>
              <ul style="margin: 0; padding-left: 20px;">
                <li>This is a temporary password that must be changed on your first login</li>
                <li>Do not share your password with anyone</li>
                <li>Use a strong, unique password for your account</li>
                <li>Maintain client confidentiality at all times</li>
                <li>Contact your administrator if you have any issues</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.portalUrl}/login" class="btn">🚀 Login to Portal</a>
            </div>
            
            <h3>What You Can Do:</h3>
            <ul>
              <li>Manage your client appointments and schedules</li>
              <li>Create and update recovery notes for clients</li>
              <li>Send and receive messages with clients and staff</li>
              <li>View client information and medical records</li>
              <li>Access telehealth sessions for remote consultations</li>
              <li>Manage billing and invoices for your services</li>
              <li>Track client progress and recovery milestones</li>
            </ul>
            
            <h3>Your Responsibilities:</h3>
            <ul>
              <li>Provide compassionate care and support to clients</li>
              <li>Maintain accurate and up-to-date client records</li>
              <li>Follow TiNHiH's recovery protocols and guidelines</li>
              <li>Collaborate with other team members for comprehensive care</li>
              <li>Ensure client privacy and confidentiality</li>
            </ul>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              If you have any questions or need assistance, please contact your administrator or the TiNHiH Portal support team.
            </p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} TiNHiH Portal. All rights reserved.</p>
            <p>This is an automated welcome email from TiNHiH Portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to TiNHiH Portal - Your Recovery Specialist Account

Hello ${data.recipientName}!

Welcome to the TiNHiH Portal team! Your recovery specialist account has been created and you're now ready to help clients on their recovery journey.

Your Account Details:
- Role: Recovery Specialist
- Specialty: ${data.specialty}
- Organization: TiNHiH - There is No Hero in Heroin

Your Temporary Password: ${data.tempPassword}
(If the password is not working, please reset it via forgot password)

Important Security Notice:
- This is a temporary password that must be changed on your first login
- Do not share your password with anyone
- Use a strong, unique password for your account
- Maintain client confidentiality at all times
- Contact your administrator if you have any issues

Login to Portal: ${data.portalUrl}/login

What You Can Do:
- Manage your client appointments and schedules
- Create and update recovery notes for clients
- Send and receive messages with clients and staff
- View client information and medical records
- Access telehealth sessions for remote consultations
- Manage billing and invoices for your services
- Track client progress and recovery milestones

Your Responsibilities:
- Provide compassionate care and support to clients
- Maintain accurate and up-to-date client records
- Follow TiNHiH's recovery protocols and guidelines
- Collaborate with other team members for comprehensive care
- Ensure client privacy and confidentiality

If you have any questions or need assistance, please contact your administrator or the TiNHiH Portal support team.

© ${new Date().getFullYear()} TiNHiH Portal. All rights reserved.
    `;

    return { html, text };
  }


}

export const emailService = new EmailService();
