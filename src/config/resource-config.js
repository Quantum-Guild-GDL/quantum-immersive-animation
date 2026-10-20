// Assets and destinations from the event's background page. No agenda is shown.
export const RESOURCE_CONFIG = {
  source: "https://quantum-guild-gdl.github.io/qiskit_fall_fest_gdl/background/",
  slotDuration: 40,
  videoScreenCount: 2,
  images: {
    discord: "assets/resources/discord-qr.svg",
    checkin: "assets/resources/checkin-qr.svg",
    qiskit: "assets/resources/qiskit-white.svg",
    ibm: "assets/resources/ibm-quantum.png",
    cryo: "assets/resources/ibm-cryo.jpg",
    research: "assets/resources/ibm-research.jpg",
  },
  videos: {
    cryo: "assets/videos/ibm-cryo.mp4",
    research: "assets/videos/ibm-research.mp4",
  },
  qr: {
    discord: { title: ["Únete a", "Discord"], description: "Conecta con la comunidad cuántica.", url: "https://discord.gg/Na6NvVKeG", label: "discord.gg/Na6NvVKeG" },
    checkin: { title: ["Registra tu", "asistencia"], description: "Completa tu check-in del festival.", url: "https://ibm.biz/IBMQFF26", label: "ibm.biz/IBMQFF26" },
  },
};
