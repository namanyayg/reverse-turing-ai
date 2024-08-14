import { createOrContinueSessionForUser } from "../services/chat"

var express = require("express")
var router = express.Router()

router.post("/chat", async (req, res) => {
  const response = await createOrContinueSessionForUser(req.body.userId, req.body.message)
  if (response.code === 200) {
    console.log(`Response: ${response.data}`)
    res.status(200).json(response.data)
  } else {
    console.error(`Error: ${JSON.stringify(response, null, 2)}`)
    if (response.code >= 400) {
      res.status(response.code).end()
    } else {
      res.status(500).end()
    }
  }
})

module.exports = router
