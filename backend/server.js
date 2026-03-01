require('dotenv').config();
const app = require('./src/app');
const { startCronJobs } = require('./src/jobs/resetPayments');

const PORT = process.env.PORT || 5000;

// Start cron jobs
startCronJobs();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
});
