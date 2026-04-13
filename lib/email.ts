import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = 'DroneDeliver <onboarding@resend.dev>';

// ─── HTML email templates ────────────────────────────────────────────────────

function baseTemplate(title: string, body: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">🚁 DroneDeliver</h1>
        </td></tr>
        <!-- Title -->
        <tr><td style="padding:28px 32px 8px;">
          <h2 style="margin:0;color:#f1f5f9;font-size:18px;font-weight:600;">${title}</h2>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:12px 32px 28px;color:#94a3b8;font-size:14px;line-height:1.6;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #334155;color:#64748b;font-size:12px;">
          This is an automated notification from DroneDeliver.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function keyValueRow(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 12px;color:#94a3b8;font-size:13px;font-weight:600;white-space:nowrap;">${label}</td>
    <td style="padding:6px 12px;color:#e2e8f0;font-size:13px;">${value}</td>
  </tr>`;
}

function detailsTable(rows: Array<[string, string]>) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:12px 0;border:1px solid #334155;border-radius:8px;overflow:hidden;width:100%;background:#0f172a;">
    ${rows.map(([label, value]) => keyValueRow(label, value)).join('')}
  </table>`;
}

function statusPill(text: string, bgColor: string) {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:9999px;background:${bgColor};color:#fff;font-size:12px;font-weight:600;">${text}</span>`;
}

// ─── Public email functions ──────────────────────────────────────────────────

/**
 * Notify the seller that their drone has taken off.
 */
export async function sendDroneTakeoffEmail(params: {
  sellerEmail: string;
  sellerName: string;
  orderId: number;
  batchId: number;
  droneId: number;
}) {
  const { sellerEmail, sellerName, orderId, batchId, droneId } = params;

  const html = baseTemplate(
    `Your drone is on its way! ${statusPill('Out for Delivery', '#6366f1')}`,
    `<p style="color:#e2e8f0;">Hi <strong>${sellerName}</strong>,</p>
     <p>Great news! <strong>Drone #${droneId}</strong> has taken off and is now en route to deliver your package.</p>
     ${detailsTable([
       ['Order ID', `#${orderId}`],
       ['Batch', `#${batchId}`],
       ['Drone', `#${droneId}`],
       ['Status', 'Out for Delivery'],
     ])}
     <p>You can track the delivery in real time from your seller dashboard.</p>`
  );

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: sellerEmail,
      subject: `🚁 Drone #${droneId} has taken off — Order #${orderId}`,
      html,
    });
    if (error) console.error(`[email] takeoff failed for ${sellerEmail}:`, error.message);
    else console.log(`[email] takeoff notification sent to ${sellerEmail}`);
  } catch (err) {
    console.error(`[email] takeoff exception for ${sellerEmail}:`, (err as Error).message);
  }
}

/**
 * Notify the seller that their order has been delivered.
 */
export async function sendDeliveryCompleteEmail(params: {
  sellerEmail: string;
  sellerName: string;
  orderId: number;
  batchId: number;
  droneId: number;
}) {
  const { sellerEmail, sellerName, orderId, batchId, droneId } = params;

  const html = baseTemplate(
    `Delivery complete! ${statusPill('Delivered', '#22c55e')}`,
    `<p style="color:#e2e8f0;">Hi <strong>${sellerName}</strong>,</p>
     <p>Your package has been successfully delivered by <strong>Drone #${droneId}</strong>. ✅</p>
     ${detailsTable([
       ['Order ID', `#${orderId}`],
       ['Batch', `#${batchId}`],
       ['Drone', `#${droneId}`],
       ['Status', 'Delivered'],
     ])}
     <p>Thank you for using DroneDeliver!</p>`
  );

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: sellerEmail,
      subject: `✅ Order #${orderId} delivered successfully`,
      html,
    });
    if (error) console.error(`[email] delivery-complete failed for ${sellerEmail}:`, error.message);
    else console.log(`[email] delivery-complete notification sent to ${sellerEmail}`);
  } catch (err) {
    console.error(`[email] delivery-complete exception for ${sellerEmail}:`, (err as Error).message);
  }
}

/**
 * Notify admin that a batch is ready but no drone is available.
 */
export async function sendNoDroneAvailableEmail(params: {
  adminEmail: string;
  batchId: number;
  zoneId: number | null;
  orderCount: number;
}) {
  const { adminEmail, batchId, zoneId, orderCount } = params;

  const html = baseTemplate(
    `⚠️ No drone available ${statusPill('Action Required', '#ef4444')}`,
    `<p style="color:#e2e8f0;">Hi Admin,</p>
     <p>A batch is ready for dispatch but <strong>no drone is currently available</strong> for assignment.</p>
     ${detailsTable([
       ['Batch ID', `#${batchId}`],
       ['Zone', zoneId ? `#${zoneId}` : 'Unknown'],
       ['Orders', `${orderCount}`],
       ['Status', 'Waiting for drone'],
     ])}
     <p style="color:#fbbf24;"><strong>Please allocate a drone manually or ensure drones are returned to available status.</strong></p>`
  );

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: adminEmail,
      subject: `⚠️ No drone available for Batch #${batchId}`,
      html,
    });
    if (error) console.error(`[email] no-drone failed for ${adminEmail}:`, error.message);
    else console.log(`[email] no-drone alert sent to ${adminEmail}`);
  } catch (err) {
    console.error(`[email] no-drone exception for ${adminEmail}:`, (err as Error).message);
  }
}
