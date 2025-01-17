import { createLogger, format, transports } from "winston";

const logger = createLogger({
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss" }),
    format.printf(log => `[${log.timestamp}][${log.level.toUpperCase()}]: ${log.message}`)
  ),
  transports: [new transports.Console()]
})

export {
  logger
};
