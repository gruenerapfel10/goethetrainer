/**
 * Mock questions for debugging and testing purposes
 * Preserved from the original question-generator.ts implementation
 */

export const MOCK_MULTIPLE_CHOICE_QUESTIONS = [
  {
    prompt: `Worauf hat sich das Unternehmen StadtTours spezialisiert?`,
    context: `Der Name ist Programm – das Unternehmen hat sich auf Reisen spezialisiert, für die man nicht lange in die Ferne schweifen muss. 20 Teams in ganz Deutschland zeigen ausgewählte Städte aus ungewöhnlichen, spannenden Perspektiven. Die Reisenden werden eingeladen, die besuchte Stadt und ihre Umgebung zu „entziffern", und kommen darüber ins Gespräch.`,
    options: [
      { id: '0', text: `Geschäftsreisen für Unternehmen` }, // Example/Beispiel
      { id: '1', text: `Internationale Reisen in ferne Länder` },
      { id: '2', text: `Nahreisen zu ausgewählten Städten in Deutschland` },
      { id: '3', text: `Luxusreisen mit Hotels und Restaurants` },
      { id: '4', text: `Abenteuerreisen in die Alpen` }
    ],
    correctOptionId: '2'
  },
  {
    prompt: `Wie viele Teams hat StadtTours in ganz Deutschland?`,
    context: `Der Name ist Programm – das Unternehmen hat sich auf Reisen spezialisiert, für die man nicht lange in die Ferne schweifen muss. 20 Teams in ganz Deutschland zeigen ausgewählte Städte aus ungewöhnlichen, spannenden Perspektiven.`,
    options: [
      { id: '0', text: `50 Teams` }, // Example
      { id: '1', text: `5 Teams` },
      { id: '2', text: `10 Teams` },
      { id: '3', text: `20 Teams` },
      { id: '4', text: `100 Teams` }
    ],
    correctOptionId: '3'
  },
  {
    prompt: `Was ist das Besondere an den StadtTours-Reisen?`,
    context: `Die Reisenden werden eingeladen, die besuchte Stadt und ihre Umgebung zu „entziffern", und kommen darüber ins Gespräch. Auf ihren Entdeckungsreisen besichtigen sie nicht nur touristische Attraktionen, sondern erleben auch Geschichten aus dem Alltagsleben der jeweiligen Stadt.`,
    options: [
      { id: '0', text: `Sie dauern immer nur einen Tag` }, // Example
      { id: '1', text: `Sie besuchen nur bekannte touristische Sehenswürdigkeiten` },
      { id: '2', text: `Die Reisenden erhalten Einblicke in Alltagsgeschichten und Kultur der Stadt` },
      { id: '3', text: `Sie sind die günstigsten Reisen in Deutschland` },
      { id: '4', text: `Sie sind nur für erfahrene Wanderer gedacht` }
    ],
    correctOptionId: '2'
  },
  {
    prompt: `Welche Art von Menschen arbeitet bei StadtTours?`,
    context: `Ob Historiker*innen, Geograf*innen, Journalist*innen, Schauspieler*innen oder Schriftsteller*innen: All diese Expertinnen und Experten bringen nicht nur Fachkompetenz, sondern darüber hinaus auch Erfahrung im Umgang mit Gruppen mit.`,
    options: [
      { id: '0', text: `Nur ausgebildete Stadtführer` }, // Example
      { id: '1', text: `Nur Tourismusprofis und Reiseleiter` },
      { id: '2', text: `Experten aus verschiedenen Fachrichtungen mit Gruppenführungserfahrung` },
      { id: '3', text: `Hauptsächlich Geschichtsprofessoren` },
      { id: '4', text: `Vorwiegend arbeitslose Akademiker` }
    ],
    correctOptionId: '2'
  },
  {
    prompt: `Welche Philosophie verfolgt StadtTours?`,
    context: `Von Anfang an praktiziert das junge Unternehmen die Idee des sanften Tourismus. Seine Gründer waren davon Wegbereiter für umwelt- und sozialverträgliches Reisen sowie für zeitgemäßen und nachhaltigen Tourismus.`,
    options: [
      { id: '0', text: `Budget-Tourismus` }, // Example
      { id: '1', text: `Massentourismus und schnelle Reisen` },
      { id: '2', text: `Luxusfernreisen` },
      { id: '3', text: `Sanfter und nachhaltiger Tourismus` },
      { id: '4', text: `Extremsport-Abenteuer` }
    ],
    correctOptionId: '3'
  },
  {
    prompt: `Welche Aktivitäten bietet StadtTours an?`,
    context: `Die Angebote der einzelnen Reise-Teams verbinden städtetouristische Ansprüche mit Niveau: Stadtspaziergänge mit App zum selbstständigen Erkunden, Stadtspiele als Wettbewerbe für größere Gruppen, lebendige Lesungen zur Stadtgeschichte, Rundfahrten mit E-Bikes und E-Rollern oder mit dem „normalen" Fahrrad.`,
    options: [
      { id: '0', text: `Nur Sportaktivitäten` }, // Example
      { id: '1', text: `Nur Busfahrten und Museumsbesuche` },
      { id: '2', text: `Verschiedene Aktivitäten wie App-Spaziergänge, Spiele, Lesungen und Fahrradtouren` },
      { id: '3', text: `Nur Luxus-Hotels und Restaurants` },
      { id: '4', text: `Nur Underground-Szenen` }
    ],
    correctOptionId: '2'
  },
  {
    prompt: `Wie viele Städte werden von StadtTours angeboten?`,
    context: `Ob nun in Millionenstädten wie Berlin, Hamburg und München oder in einer der anderen 17 Städte – die Programme passen sich den Wünsche der Gäste an.`,
    options: [
      { id: '0', text: `Über 50 Städte` }, // Example
      { id: '1', text: `3 große Städte` },
      { id: '2', text: `Nur 5 Städte` },
      { id: '3', text: `Etwa 20 Städte` },
      { id: '4', text: `7 Städte` }
    ],
    correctOptionId: '3'
  },
  {
    prompt: `Für wen sind die StadtTours-Reisen besonders geeignet?`,
    context: `Die Reisen eignen sich für Gruppen jeden Alters, besonders jedoch für Schulklassen. Jede Stadt hat ihren ganz eigenen Charme, und jedes StadtTours-Team hat überall einzigartige Programme für seine Besucherinnen und Besucher vorbereitet.`,
    options: [
      { id: '0', text: `Nur für Geschäftsreisende` }, // Example
      { id: '1', text: `Nur für ältere Menschen` },
      { id: '2', text: `Nur für einzelne Reisende` },
      { id: '3', text: `Für Gruppen aller Altersgruppen, besonders Schulklassen` },
      { id: '4', text: `Nur für Sportler` }
    ],
    correctOptionId: '3'
  },
  {
    prompt: `Was zeichnet die Gründer von StadtTours aus?`,
    context: `Die Gründer von StadtTours waren von Anfang an Wegbereiter für umwelt- und sozialverträgliches Reisen. Sie praktizierten die Idee des sanften Tourismus, bevor dieser Begriff noch populär wurde, und setzten sich für zeitgemäßen und nachhaltigen Tourismus ein.`,
    options: [
      { id: '0', text: `Sie waren Massenproduzenten von Billigreisen` }, // Example
      { id: '1', text: `Sie waren Pioniere des nachhaltigen und sanften Tourismus` },
      { id: '2', text: `Sie konzentrierten sich nur auf Luxusreisen` },
      { id: '3', text: `Sie waren ausschließlich im internationalen Geschäft tätig` },
      { id: '4', text: `Sie spezialisierten sich nur auf Wanderreisen` }
    ],
    correctOptionId: '1'
  }
];