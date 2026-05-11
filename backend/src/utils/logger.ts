import pino from 'pino';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport:
        process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' } }
            : undefined,
    base: { service: 'habit-tracker-api' },
    serializers: {
        err: pino.stdSerializers.err,
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
    },
});

export default logger;
