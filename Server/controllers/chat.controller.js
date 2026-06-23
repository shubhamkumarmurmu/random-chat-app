async function  session(req, res)  {
  try {
    const { sessionId } = req.params;

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    const isParticipant = session.participants.some(
      (p) => p.toString() === req.user.id
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to view this session' });
    }

    const messages = await Message.find({ session: sessionId })
      .populate('sender', 'username')
      .sort({ createdAt: 1 });

    res.json({ messages });
  } catch (err) {
    console.error('Messages fetch error:', err.message);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
}

module.exports={session}