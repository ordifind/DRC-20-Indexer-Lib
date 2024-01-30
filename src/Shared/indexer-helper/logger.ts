import moment from "moment";

const Logger = {
  Success: (text: string) => {
    const DateNow = new Date();
    const DateFromatted = moment(DateNow).format("Y-M-D h:m:s A");
    console.log(`[${DateFromatted}]::Info Logs:: => ${text}`);
  },
  error: (message: string) => {
    const DateNow = new Date();
    const DateFromatted = moment(DateNow).format("Y-M-D h:m:s A");
    console.log(`[${DateFromatted}]::Error Logs:: => ${message}`);
  },
};

export default Logger;
