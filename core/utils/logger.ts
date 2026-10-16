class Logger {
  logText(tag: string, text: string | number): void {
    console.log(`%c[${tag}] %c${text}`, 'color:red', 'color:black')
  }

  logObj(tag: string, obj: unknown, str: boolean = false): void {
    this.logText(tag, ':')
    console.log(str ? JSON.parse(JSON.stringify(obj)) : obj)
    this.logText(tag, '----------')
  }
}

const instance = new Logger();
export default instance;
