# GREEN-API nodes for Node-RED

## Support links

[![Support](https://img.shields.io/badge/support@green--api.com-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:support@greenapi.com)
[![Support](https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/greenapi_support_eng_bot)
[![Support](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/77273122366)

Send and receive WhatsApp, Telegram and MAX messages in Node-RED flows through [GREEN-API](https://green-api.com).

## Installation

In the Node-RED editor: **Menu > Manage palette > Install**, search for `@green-api/node-red-greenapi`.

Or in your Node-RED user directory (usually `~/.node-red`):

```bash
npm install @green-api/node-red-greenapi
```

Requires Node-RED 4 or newer and Node.js 22.9 or newer.

## Nodes

| Node | What it does |
|---|---|
| **greenapi-instance** (config) | Holds `idInstance`, `apiTokenInstance`, `apiUrl` and `mediaUrl` from the [GREEN-API console](https://console.green-api.com). File uploads go to `mediaUrl`. The messenger (WhatsApp, Telegram, MAX) is detected from the instance. |
| **send** | Sends text, a file by URL, an uploaded file (Buffer), a location, a contact or a poll. "Upload only" uploads a file without sending it and outputs its URL, to send one file to many chats by URL. Every field can be fixed or read from `msg`, flow or global context. Outputs the GREEN-API response in `msg.payload`. |
| **receive** | Outputs incoming notifications: `msg.payload` is the notification, `msg.topic` its type. Works by polling or as a webhook endpoint. |
| **api** | Calls any GREEN-API method by name, for groups, journals, statuses, contacts and settings: GET with optional query parameters, POST with a JSON body, or POST with a file (`setProfilePicture`, `setGroupPicture`). |

### Chat IDs

`send` accepts a chat ID or a phone number:

- `79001234567@c.us`, `...@g.us`: used as is.
- A phone number in any format (`+7 900 123-45-67`): becomes `79001234567@c.us`.
- A plain number on Telegram or MAX (`7203921144`, `-1001234567890`): used as a chat ID.

### Receiving: polling or webhook

- **Polling** reads the instance notification queue. Node-RED needs no public address, so this works on a Raspberry Pi or a home server. The instance `webhookUrl` must be empty, otherwise GREEN-API does not hand notifications to polling and the node shows a red status. Each notification is removed from the queue after it is output.
- **Webhook** adds an HTTP endpoint at the node's path under the Node-RED HTTP root. Set the instance `webhookUrl` to its public URL, e.g. `https://nodered.example.com/greenapi/in`. If you set a token on the node, set the same `webhookUrlToken` on the instance.

Which notification types GREEN-API sends at all is set in the instance settings. The node's type list only filters what reaches the flow.

### Errors

`send` and `api` report errors to the `catch` node and show them in the node status.

## Examples

**Menu > Import > Examples > @green-api/node-red-greenapi**:

- `send-text`: send a text from an inject node.
- `echo-bot`: reply to incoming text messages with the same text.
- `call-any-method`: read the instance state with the `api` node.

## Development

```bash
npm install
npm run build
npm test
```

Try it in a local Node-RED:

```bash
cd ~/.node-red
npm install <path to this repository>
node-red
```

## License

[MIT](LICENSE)
