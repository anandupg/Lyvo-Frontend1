// Google Gemini Pro AI service integration
// This service provides real AI responses using Google's Gemini Pro model

class AIService {
  constructor() {
    this.isInitialized = false;
    this.apiKey = null;
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    this.fallbackResponses = this.buildFallbackResponses();
  }

  buildFallbackResponses() {
    return {
      pricing: [
        "Our rooms start from ₹8,000/month for shared spaces and ₹15,000/month for single rooms. All prices include WiFi, utilities, and basic amenities!",
        "Pricing depends on location and room type. Single rooms range from ₹12,000-25,000/month, while shared spaces start at ₹8,000/month. We offer great value for money!",
        "We have flexible pricing options! Single rooms: ₹12,000-25,000/month, Shared rooms: ₹8,000-15,000/month. All inclusive of utilities and amenities."
      ],
      locations: [
        "We have properties in prime locations across multiple cities. Our properties are strategically positioned in the best neighborhoods with easy access to business districts and residential areas!",
        "Our properties are located in prime areas across different cities. We have multiple locations including city centers, business districts, and residential neighborhoods.",
        "We operate in multiple cities with properties in prime locations. Each property is carefully selected for its accessibility and neighborhood quality."
      ],
      amenities: [
        "All our properties include: High-speed WiFi, 24/7 security, housekeeping, laundry facilities, common kitchen, and co-working spaces. Some locations also have gyms and cafeterias!",
        "Standard amenities: WiFi, security, cleaning, kitchen access, and common areas. Premium locations include gyms, cafeterias, gaming rooms, and rooftop spaces.",
        "We provide WiFi, security, housekeeping, shared kitchens, study areas, and common lounges. Premium properties also feature gyms, cafeterias, and recreational facilities."
      ],
      booking: [
        "To book a room: 1) Browse our listings, 2) Schedule a virtual or in-person tour, 3) Complete the application form, 4) Sign the digital agreement. The process takes 2-3 days!",
        "Booking is simple! Visit any room listing, click 'Book Now', fill the application, and we'll get back within 24 hours. You can also schedule a tour first.",
        "Our booking process: Select a room → Schedule tour → Submit application → Digital agreement → Move in! We typically process applications within 48 hours."
      ],
      roommate: [
        "We use AI-powered compatibility matching based on lifestyle, work schedule, cleanliness preferences, and interests. You can also specify gender preferences and age range.",
        "Our roommate matching considers work schedules, lifestyle habits, cleanliness standards, and personal interests. We ensure compatible living arrangements for everyone.",
        "We match roommates using advanced algorithms that consider lifestyle compatibility, work schedules, and personal preferences. You can also choose your own roommates if you prefer."
      ],
      security: [
        "All properties have 24/7 security, CCTV cameras, secure entry systems, and verified property owners. We also conduct background checks on all residents.",
        "Security features include: 24/7 guards, CCTV surveillance, secure access cards, and emergency response systems. All property owners are background-verified.",
        "Your safety is our priority! We provide 24/7 security, surveillance systems, secure access, and verified property owners. All residents undergo background verification."
      ],
      payment: [
        "We accept online payments via UPI, cards, and net banking. Rent is typically paid monthly, and we offer flexible payment plans. No hidden charges!",
        "Payment options: UPI, credit/debit cards, net banking, and digital wallets. Rent is due monthly, and we provide transparent billing for all utilities.",
        "Payments can be made online through our secure portal. We accept UPI, cards, and net banking. Monthly rent includes utilities with no hidden costs."
      ],
      support: [
        "Our support team is available 24/7 via chat, phone (+91 98765 43210), or email (support@lyvoplus.com). We typically respond within 2 hours!",
        "You can reach us anytime at support@lyvoplus.com or call +91 98765 43210. Our team responds within 2 hours and is available 24/7.",
        "24/7 support available! Contact us at support@lyvoplus.com or +91 98765 43210. We also have in-app chat support for immediate assistance."
      ],
      greeting: [
        "Hello! Welcome to Lyvo+. I'm here to help you find your perfect co-living space!",
        "Hi there! Ready to discover amazing co-living opportunities?",
        "Welcome to Lyvo+! Let's find you the ideal living space with great roommates."
      ],
      default: [
        "I'm here to help with co-living questions! You can ask about pricing, locations, amenities, booking process, roommate matching, security, payments, or support.",
        "I can assist with finding rooms, understanding our services, booking process, roommate matching, and general inquiries. What would you like to know?",
        "Feel free to ask about our co-living spaces, pricing, locations, amenities, booking process, or any other questions about Lyvo+!"
      ]
    };
  }

  async initialize() {
    try {
      console.log("Initializing Google Gemini Pro AI Service...");

      // Use the provided API key from AI Studio
      this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (!this.apiKey) {
        throw new Error("Google Gemini API key not found");
      }

      // Test the API connection with retry logic
      await this.testConnectionWithRetry();

      this.isInitialized = true;
      console.log("Google Gemini Pro AI Service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Gemini AI Service:", error);
      // Don't throw error - allow fallback responses to work
      console.log("🔄 AI Service will use fallback responses due to initialization failure");
      this.isInitialized = false; // Mark as not initialized to use fallbacks
    }
  }

  async testConnectionWithRetry() {
    const maxRetries = 2; // Reduced retries
    const baseDelay = 5000; // 5 seconds base delay

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Testing Gemini API connection (attempt ${attempt}/${maxRetries})`);

        const testResponse = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: "test"
              }]
            }]
          })
        });

        if (testResponse.ok) {
          console.log("✅ Gemini API connection test successful");
          return;
        } else if (testResponse.status === 429) {
          console.warn(`⚠️ Rate limit hit (429). Attempt ${attempt}/${maxRetries}`);
          if (attempt < maxRetries) {
            const waitTime = baseDelay * attempt; // Exponential backoff
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }

        throw new Error(`API test failed: ${testResponse.status}`);
      } catch (error) {
        console.error(`❌ Gemini API connection test failed (attempt ${attempt}):`, error);

        if (attempt === maxRetries) {
          console.warn("🚫 All retry attempts failed. AI service will use fallback responses.");
          throw error;
        }

        if (error.message.includes('429')) {
          const waitTime = baseDelay * attempt;
          console.log(`⏳ Rate limit detected. Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
  }

  async testConnection() {
    try {
      const testResponse = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Hello, respond with 'Connection successful'"
            }]
          }]
        })
      });

      if (!testResponse.ok) {
        throw new Error(`API test failed: ${testResponse.status}`);
      }

      console.log("Gemini API connection test successful");
    } catch (error) {
      console.error("Gemini API connection test failed:", error);
      throw error;
    }
  }

  async getChatResponse(messages, model = "gemini-2.5-flash") {
    // If not initialized, try to initialize but don't fail if it doesn't work
    if (!this.isInitialized) {
      console.log("🔄 Initializing AI service...");
      try {
        await this.initialize();
      } catch (error) {
        console.log("⚠️ AI service initialization failed, using fallback responses");
      }
    }

    // If still not initialized (due to API issues), use fallback responses
    if (!this.isInitialized) {
      console.log("🔄 Using fallback responses due to AI service unavailability");
      const userMessage = messages[messages.length - 1]?.content || "";
      const fallbackResponse = this.getFallbackResponse(userMessage);
      console.log("📝 Fallback response:", fallbackResponse);
      return fallbackResponse;
    }

    try {
      console.log("🚀 Processing message with Google Gemini 2.5 Flash:", { model, messageCount: messages.length });

      const response = await this.callGeminiAPI(messages);

      console.log("✅ Gemini 2.5 Flash Response generated");
      return response;
    } catch (error) {
      console.error("❌ Error getting Gemini response:", error);
      console.log("🔄 Falling back to local responses");
      // Fallback to local responses if Gemini fails
      const userMessage = messages[messages.length - 1]?.content || "";
      const fallbackResponse = this.getFallbackResponse(userMessage);
      console.log("📝 Fallback response:", fallbackResponse);
      return fallbackResponse;
    }
  }

  async fetchProjectData() {
    try {
      console.log("📊 Fetching project data from database...");

      // Fetch properties data from your property service API
      const response = await fetch('http://localhost:3003/api/public/properties', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.warn("⚠️ Could not fetch project data, using fallback");
        return this.getFallbackProjectData();
      }

      const data = await response.json();
      console.log("✅ Project data fetched:", data);

      // Transform the data to a more useful format for the AI
      const transformedData = this.transformPropertyData(data);
      return transformedData;
    } catch (error) {
      console.warn("⚠️ Error fetching project data:", error);
      return this.getFallbackProjectData();
    }
  }

  transformPropertyData(apiData) {
    try {
      const properties = apiData.properties || [];
      const cities = [...new Set(properties.map(prop => prop.address?.city).filter(Boolean))];
      const priceRanges = properties.map(prop => {
        const rooms = prop.rooms || [];
        if (rooms.length === 0) return null;
        const prices = rooms.map(room => room.rent).filter(Boolean);
        if (prices.length === 0) return null;
        return {
          min: Math.min(...prices),
          max: Math.max(...prices)
        };
      }).filter(Boolean);

      const allPrices = priceRanges.flatMap(range => [range.min, range.max]);
      const averagePrice = allPrices.length > 0
        ? `₹${Math.min(...allPrices).toLocaleString()}-${Math.max(...allPrices).toLocaleString()}`
        : 'Flexible pricing';

      return {
        properties: properties.slice(0, 5).map(prop => ({
          id: prop._id,
          name: prop.property_name,
          location: prop.address?.city || 'Multiple cities',
          price: this.getPriceRange(prop.rooms),
          type: this.getRoomTypes(prop.rooms),
          amenities: this.getAmenities(prop.rooms)
        })),
        cities: cities.length > 0 ? cities : ['Multiple cities'],
        totalProperties: properties.length,
        averagePrice: averagePrice
      };
    } catch (error) {
      console.error("Error transforming property data:", error);
      return this.getFallbackProjectData();
    }
  }

  getPriceRange(rooms) {
    if (!rooms || rooms.length === 0) return 'Contact for pricing';
    const prices = rooms.map(room => room.rent).filter(Boolean);
    if (prices.length === 0) return 'Contact for pricing';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `₹${min.toLocaleString()}` : `₹${min.toLocaleString()}-${max.toLocaleString()}`;
  }

  getRoomTypes(rooms) {
    if (!rooms || rooms.length === 0) return 'Various types';
    const types = [...new Set(rooms.map(room => room.room_type))];
    return types.join(', ');
  }

  getAmenities(rooms) {
    if (!rooms || rooms.length === 0) return ['WiFi', 'Security'];
    const allAmenities = new Set();
    rooms.forEach(room => {
      if (room.amenities) {
        Object.keys(room.amenities).forEach(amenity => {
          if (room.amenities[amenity]) {
            allAmenities.add(amenity.charAt(0).toUpperCase() + amenity.slice(1));
          }
        });
      }
    });
    return Array.from(allAmenities).slice(0, 5);
  }

  getFallbackProjectData() {
    return {
      properties: [
        {
          id: 1,
          name: "Lyvo+ Premium",
          location: "Prime Location",
          price: "₹15,000-25,000",
          type: "Single Room",
          amenities: ["WiFi", "Security", "Kitchen", "Laundry"]
        },
        {
          id: 2,
          name: "Lyvo+ Shared",
          location: "Downtown Area",
          price: "₹8,000-12,000",
          type: "Shared Room",
          amenities: ["WiFi", "Security", "Common Area"]
        },
        {
          id: 3,
          name: "Lyvo+ Studio",
          location: "City Center",
          price: "₹20,000-30,000",
          type: "Studio",
          amenities: ["WiFi", "Security", "AC", "Private Bathroom"]
        }
      ],
      cities: ["Multiple Cities"],
      totalProperties: "50+",
      averagePrice: "₹10,000-25,000"
    };
  }

  async callGeminiAPI(messages) {
    try {
      console.log("🌐 Calling Gemini API...");

      // Fetch real project data
      const projectData = await this.fetchProjectData();

      const systemPrompt = `You are Lyvo+ Assistant, a helpful AI assistant for a co-living platform called Lyvo+. 

About Lyvo+:
- We provide co-living spaces (PG accommodations) across multiple cities
- We offer various room types with flexible pricing options
- All prices include WiFi, utilities, and basic amenities
- We have properties in prime locations across different cities
- We provide 24/7 security, housekeeping, common kitchens, co-working spaces
- Some premium locations have gyms, cafeterias, gaming rooms
- We use AI-powered roommate matching based on lifestyle compatibility
- Booking process: Browse → Tour → Apply → Digital Agreement → Move in
- Support available 24/7 at support@lyvoplus.com

Current Project Data:
- Total Properties: ${projectData.totalProperties || 'Multiple'}
- Price Range: ${projectData.averagePrice || 'Flexible pricing'}
- Available Cities: ${projectData.cities?.join(', ') || 'Multiple cities'}
- Property Types: Single rooms, Shared rooms, Premium suites

Sample Properties:
${projectData.properties?.slice(0, 3).map(prop =>
        `- ${prop.name} (${prop.type}): ${prop.price} in ${prop.location}`
      ).join('\n') || '- Various properties available'}

Guidelines:
- Be friendly, helpful, and professional
- Focus on co-living, room rentals, and PG accommodations
- Provide accurate information about our services using the project data above
- If asked about topics outside co-living, politely redirect to our services
- Keep responses concise but informative (max 200 words)
- Always be encouraging about our co-living community
- Use the provided project data to give accurate pricing and location information`;

      const userMessage = messages[messages.length - 1]?.content || "";
      const fullPrompt = `${systemPrompt}\n\nUser Question: ${userMessage}`;

      console.log("📤 Sending request to Gemini API...");
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 200,
          }
        })
      });

      console.log("📥 Gemini API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Gemini API error response:", errorText);
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📋 Gemini API response data:", data);

      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error("Invalid response format from Gemini API");
      }

      const aiResponse = data.candidates[0].content.parts[0].text;
      console.log("🎯 Final AI response:", aiResponse);
      return aiResponse;
    } catch (error) {
      console.error("❌ Gemini API call failed:", error);
      throw error;
    }
  }

  getFallbackResponse(userMessage) {
    const message = userMessage.toLowerCase();

    // Enhanced keyword matching with context awareness
    if (message.includes('price') || message.includes('cost') || message.includes('rent') || message.includes('fee') || message.includes('expensive') || message.includes('cheap')) {
      return this.getRandomResponse('pricing');
    } else if (message.includes('location') || message.includes('area') || message.includes('where') || message.includes('place') || message.includes('bangalore') || message.includes('koramangala') || message.includes('hsr')) {
      return this.getRandomResponse('locations');
    } else if (message.includes('amenity') || message.includes('facility') || message.includes('wifi') || message.includes('gym') || message.includes('kitchen') || message.includes('security') || message.includes('laundry')) {
      return this.getRandomResponse('amenities');
    } else if (message.includes('book') || message.includes('apply') || message.includes('reserve') || message.includes('process') || message.includes('how to') || message.includes('procedure')) {
      return this.getRandomResponse('booking');
    } else if (message.includes('roommate') || message.includes('flatmate') || message.includes('match') || message.includes('compatibility') || message.includes('sharing')) {
      return this.getRandomResponse('roommate');
    } else if (message.includes('security') || message.includes('safe') || message.includes('guard') || message.includes('cctv') || message.includes('safety')) {
      return this.getRandomResponse('security');
    } else if (message.includes('payment') || message.includes('pay') || message.includes('upi') || message.includes('card') || message.includes('money') || message.includes('billing')) {
      return this.getRandomResponse('payment');
    } else if (message.includes('support') || message.includes('help') || message.includes('contact') || message.includes('call') || message.includes('assistance')) {
      return this.getRandomResponse('support');
    } else if (message.includes('hello') || message.includes('hi') || message.includes('hey') || message.includes('good morning') || message.includes('good afternoon') || message.includes('good evening')) {
      return this.getRandomResponse('greeting');
    } else {
      return this.getRandomResponse('default');
    }
  }

  getRandomResponse(category) {
    const responses = this.fallbackResponses[category] || this.fallbackResponses.default;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async getLyvoAssistantResponse(userMessage) {
    try {
      console.log("🤖 Getting AI response for:", userMessage);
      // Use Google Gemini Pro for intelligent responses
      const response = await this.getChatResponse([{ role: "user", content: userMessage }]);
      console.log("✅ AI Response received:", response);
      return response;
    } catch (error) {
      console.error("❌ Error getting Lyvo assistant response:", error);
      console.log("🔄 Falling back to demo response");
      // Fallback response if AI service fails
      return "I'm sorry, I'm having trouble right now. Please try again later or contact our support team at support@lyvoplus.com for immediate assistance.";
    }
  }
}

// Create singleton instance
const aiService = new AIService();
export default aiService;
