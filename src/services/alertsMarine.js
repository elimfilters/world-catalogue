function alert(code, detail) {
  // Hook listo para Slack/Webhook/Email
  console.error(`[MARINE ALERT] ${code}`, detail || '');
}

module.exports = { alert };
