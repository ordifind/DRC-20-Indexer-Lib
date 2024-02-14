const Bitcore = require("bitcoin-core");
interface ConnectionArg {
  user: string;
  pass: string;
  host: string;
  port: number;
}

class ConnectionProvider {
  private host: string;
  private pass: string;
  private user: string;
  private port: number;
  public cli: any;

  constructor(arg: ConnectionArg) {
    this.user = arg.user;
    this.pass = arg.pass;
    this.host = arg.host;
    this.port = arg.port;
  }

  private async CreateConnection() {
    const Config = {
      host: this.host,
      port: this.port,
      username: this.user,
      password: this.pass,
    };
    const Client = new Bitcore(Config);
    return await Client;
  }

  async Connect() {
    if (this.cli) {
      return this.cli;
    }
    this.cli = await this.CreateConnection();
    return this.cli;
  }

  async GetTransaction(txid: string) {
    if (!this.cli) {
      await this.Connect();
      await this.GetTransaction(txid);
    }

    const TransactionData = await this.cli.getTransactionByHash(txid);
    return TransactionData;
  }
}

export default ConnectionProvider;
