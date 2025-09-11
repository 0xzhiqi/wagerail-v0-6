import { SendEmailCommand } from '@aws-sdk/client-ses'

import { awsSesClient } from './clients/aws-ses-client'

interface SendWageGroupInvitationParams {
  recipientEmail: string
  inviterName: string
  wageGroupName: string
  monthlyAmount: number
}

export async function sendWageGroupInvitation({
  recipientEmail,
  inviterName,
  wageGroupName,
  monthlyAmount,
}: SendWageGroupInvitationParams) {
  const subject = `You've been invited to join ${wageGroupName} wage group`

  const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Wage Group Invitation</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .content { padding: 20px 0; }
                .button { 
                    display: inline-block; 
                    background-color: #28a745; 
                    color: #ffffff !important; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin: 20px 0;
                    font-weight: bold;
                    border: none;
                }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 You've been invited to join a wage group!</h1>
                </div>
                
                <div class="content">
                    <p>Hello!</p>
                    
                    <p><strong>${inviterName}</strong> has invited you to join the <strong>"${wageGroupName}"</strong> wage group.</p>
                    
                    <p><strong>Payment Details:</strong></p>
                    <ul>
                        <li>Monthly Amount: <strong>$${monthlyAmount.toFixed(2)} USDC</strong></li>
                        <li>Wage Group: <strong>${wageGroupName}</strong></li>
                        <li>Invited by: <strong>${inviterName}</strong></li>
                    </ul>
                    
                    <p>To view your payment schedule and manage your account, please create an account on our platform:</p>
                    
                    <a href="https://wagerail.com" class="button" style="color: #ffffff !important;">Create Account & View Payments</a>
                    
                    <p>Once you create an account with this email address (${recipientEmail}), you'll automatically be linked to this wage group and can view your payment schedule.</p>
                    
                    <p>If you have any questions, please contact ${inviterName} directly.</p>
                </div>
                
                <div class="footer">
                    <p>This email was sent from Volonly wage management system.</p>
                    <p>If you believe you received this email in error, please ignore it.</p>
                </div>
            </div>
        </body>
        </html>
    `

  const textBody = `
        You've been invited to join a wage group!
        
        ${inviterName} has invited you to join the "${wageGroupName}" wage group.
        
        Payment Details:
        - Monthly Amount: $${monthlyAmount.toFixed(2)} USDC
        - Wage Group: ${wageGroupName}
        - Invited by: ${inviterName}
        
        To view your payment schedule and manage your account, please visit:
        https://volonly.com
        
        Once you create an account with this email address (${recipientEmail}), you'll automatically be linked to this wage group and can view your payment schedule.
        
        If you have any questions, please contact ${inviterName} directly.
        
        ---
        This email was sent from Volonly wage management system.
        If you believe you received this email in error, please ignore it.
    `

  const command = new SendEmailCommand({
    Source: process.env.AWS_SES_FROM_EMAIL!,
    Destination: {
      ToAddresses: [recipientEmail],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
      },
    },
  })

  try {
    console.log('Attempting to send email to:', recipientEmail)
    console.log('From email:', process.env.AWS_SES_FROM_EMAIL)
    console.log('AWS Region:', process.env.AWS_REGION)

    const result = await awsSesClient.send(command)
    console.log('Email sent successfully:', result.MessageId)
    return { success: true, messageId: result.MessageId }
  } catch (error) {
    console.error('Error sending email:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return { success: false, error: error }
  }
}

export async function sendWageGroupUpdateNotification({
  recipientEmail,
  inviterName,
  wageGroupName,
  monthlyAmount,
  isNewPayee = false,
}: SendWageGroupInvitationParams & { isNewPayee?: boolean }) {
  const subject = isNewPayee
    ? `You've been added to ${wageGroupName} wage group`
    : `Your ${wageGroupName} wage group has been updated`

  const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Wage Group ${isNewPayee ? 'Invitation' : 'Update'}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .content { padding: 20px 0; }
                .button { 
                    display: inline-block; 
                    background-color: #28a745; 
                    color: #ffffff !important; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin: 20px 0;
                    font-weight: bold;
                    border: none;
                }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>${isNewPayee ? "🎉 You've been added to a wage group!" : '📝 Wage group updated'}</h1>
                </div>
                
                <div class="content">
                    <p>Hello!</p>
                    
                    <p>${
                      isNewPayee
                        ? `<strong>${inviterName}</strong> has added you to the <strong>"${wageGroupName}"</strong> wage group.`
                        : `<strong>${inviterName}</strong> has updated the <strong>"${wageGroupName}"</strong> wage group.`
                    }</p>
                    
                    <p><strong>Current Payment Details:</strong></p>
                    <ul>
                        <li>Monthly Amount: <strong>$${monthlyAmount.toFixed(2)} USDC</strong></li>
                        <li>Wage Group: <strong>${wageGroupName}</strong></li>
                        <li>Managed by: <strong>${inviterName}</strong></li>
                    </ul>
                    
                    <p>To view your updated payment schedule and manage your account:</p>
                    
                    <a href="https://volonly.com" class="button" style="color: #ffffff !important;">View Payment Schedule</a>
                    
                    <p>If you don't have an account yet, create one with this email address (${recipientEmail}) to automatically access your wage group information.</p>
                </div>
                
                <div class="footer">
                    <p>This email was sent from Volonly wage management system.</p>
                </div>
            </div>
        </body>
        </html>
    `

  const command = new SendEmailCommand({
    Source: process.env.AWS_SES_FROM_EMAIL!,
    Destination: {
      ToAddresses: [recipientEmail],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
      },
    },
  })

  try {
    console.log('Attempting to send update email to:', recipientEmail)
    const result = await awsSesClient.send(command)
    console.log('Update email sent successfully:', result.MessageId)
    return { success: true, messageId: result.MessageId }
  } catch (error) {
    console.error('Error sending update email:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return { success: false, error: error }
  }
}
