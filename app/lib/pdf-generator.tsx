import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { SegmentationResult } from '@/types';
import { formatCurrency } from '@/lib/utils';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#843dff',
  },
  subsectionTitle: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 1.5,
  },
  smallText: {
    fontSize: 10,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  column: {
    flex: 1,
    paddingRight: 10,
  },
  box: {
    border: '1px solid #ddd',
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  metric: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  listItem: {
    fontSize: 11,
    marginBottom: 3,
    paddingLeft: 10,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#ddd',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
    fontSize: 10,
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
  },
});

// Create PDF Document
export const SegmentationPDF = ({ result }: { result: SegmentationResult }) => (
  <Document>
    {/* Cover Page */}
    <Page size="A4" style={styles.page}>
      <View style={{ marginTop: 100 }}>
        <Text style={{ fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>
          AI Market Segmentation Report
        </Text>
        <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 40, color: '#666' }}>
          Comprehensive Analysis and Go-to-Market Strategy
        </Text>
        <Text style={{ fontSize: 14, textAlign: 'center', color: '#666' }}>
          Generated on {new Date(result.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </Page>

    {/* Executive Summary */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Executive Summary</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Market Overview</Text>
        <View style={styles.row}>
          <View style={styles.column}>
            <View style={styles.box}>
              <Text style={styles.label}>Current TAM</Text>
              <Text style={styles.metric}>{formatCurrency(result.marketAnalysis.tam.currentValue)}</Text>
            </View>
          </View>
          <View style={styles.column}>
            <View style={styles.box}>
              <Text style={styles.label}>Projected TAM ({result.marketAnalysis.tam.projectionYear})</Text>
              <Text style={styles.metric}>{formatCurrency(result.marketAnalysis.tam.projectedValue)}</Text>
            </View>
          </View>
          <View style={styles.column}>
            <View style={styles.box}>
              <Text style={styles.label}>5-Year CAGR</Text>
              <Text style={styles.metric}>{result.marketAnalysis.cagr.toFixed(1)}%</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Findings</Text>
        <Text style={styles.text}>• Identified {result.segments.length} distinct market segments</Text>
        <Text style={styles.text}>• Total addressable opportunity of {formatCurrency(result.marketAnalysis.tam.currentValue)}</Text>
        <Text style={styles.text}>• Market growing at {result.marketAnalysis.cagr.toFixed(1)}% CAGR</Text>
        <Text style={styles.text}>• {result.marketAnalysis.competitors.length} key competitors analyzed</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Priority Segments</Text>
        {result.segments
          .filter(s => s.priorityScore && s.size)
          .sort((a, b) => 
            ((b.priorityScore?.marketAttractiveness || 0) * (b.priorityScore?.accessibility || 0)) - 
            ((a.priorityScore?.marketAttractiveness || 0) * (a.priorityScore?.accessibility || 0))
          )
          .slice(0, 3)
          .map((segment, index) => (
            <View key={segment.id} style={styles.box}>
              <Text style={styles.subsectionTitle}>
                {index + 1}. {segment.name}
              </Text>
              <Text style={styles.text}>
                Market Value: {formatCurrency(segment.size.value)} ({segment.size.percentage}% of TAM)
              </Text>
              <Text style={styles.smallText}>
                Priority: Market Attractiveness {segment.priorityScore.marketAttractiveness}/100, 
                Accessibility {segment.priorityScore.accessibility}/100
              </Text>
            </View>
          ))}
      </View>
    </Page>

    {/* Market Analysis */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Market Analysis</Text>

      {result.marketAnalysis.growthFactors && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Growth Drivers</Text>
          {Object.entries(result.marketAnalysis.growthFactors).map(([category, factors]) => (
            <View key={category} style={{ marginBottom: 10 }}>
              <Text style={styles.subsectionTitle}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
              {Array.isArray(factors) && factors.map((factor, i) => (
                <Text key={i} style={styles.listItem}>• {factor}</Text>
              ))}
            </View>
          ))}
        </View>
      )}

      {result.marketAnalysis.commercialUrgencies && result.marketAnalysis.commercialUrgencies.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commercial Urgencies</Text>
          {result.marketAnalysis.commercialUrgencies.map((urgency, i) => (
            <Text key={i} style={styles.listItem}>{i + 1}. {urgency}</Text>
          ))}
        </View>
      )}
    </Page>

    {/* Competitor Analysis */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Competitive Landscape</Text>
      
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Company</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Funding</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Specialty</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Size</Text>
        </View>
        {result.marketAnalysis.competitors.slice(0, 10).map((competitor, index) => (
          <View key={index} style={styles.tableRow}>
            <View style={[styles.tableCell, { flex: 2 }]}>
              <Text>{competitor.name || 'Unknown'}</Text>
              {competitor.headquarters && (
                <Text style={styles.smallText}>{competitor.headquarters}</Text>
              )}
            </View>
            <View style={[styles.tableCell, { flex: 1 }]}>
              <Text>{competitor.fundingTotal || 'N/A'}</Text>
            </View>
            <View style={[styles.tableCell, { flex: 2 }]}>
              <Text style={{ fontSize: 9 }}>{competitor.specialty || 'Market player'}</Text>
            </View>
            <View style={[styles.tableCell, { flex: 1 }]}>
              <Text>{competitor.employeeCount || '-'}</Text>
            </View>
          </View>
        ))}
      </View>
    </Page>

    {/* Segments Detail */}
    {result.segments.map((segment) => (
      <Page key={segment.id} size="A4" style={styles.page}>
        <Text style={styles.title}>Segment: {segment.name}</Text>
        
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>Market Value</Text>
            <Text style={styles.metric}>{formatCurrency(segment.size.value)}</Text>
            <Text style={styles.smallText}>{segment.size.percentage}% of TAM</Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>Companies/Customers</Text>
            <Text style={styles.metric}>{segment.size.count.toLocaleString()}</Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>Growth Rate</Text>
            <Text style={styles.metric}>
              {segment.size.growthRate || 'N/A'}
            </Text>
          </View>
        </View>

        {segment.painPoints && segment.painPoints.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Pain Points</Text>
            {segment.painPoints.map((pain, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <Text style={styles.text}>
                  • {pain.pain} ({pain.severity || 'medium'} severity)
                </Text>
                {pain.currentSolution && (
                  <Text style={styles.smallText}>
                    Current solution: {pain.currentSolution} {pain.costOfProblem ? `| Cost: ${pain.costOfProblem}` : ''}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {segment.useCases && segment.useCases.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Primary Use Cases</Text>
            {segment.useCases.map((useCase, i) => (
            <View key={i} style={styles.box}>
              <Text style={styles.subsectionTitle}>{useCase.scenario}</Text>
              <Text style={styles.text}>Value: {useCase.valueDelivered}</Text>
              <Text style={styles.smallText}>Implementation: {useCase.implementationTime}</Text>
            </View>
            ))}
          </View>
        )}

        {segment.messagingHooks && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Messaging</Text>
            <Text style={[styles.text, { fontStyle: 'italic', marginBottom: 10 }]}>
              "{segment.messagingHooks?.primary || 'Key value proposition for this segment'}"
            </Text>
            {segment.messagingHooks?.supporting && (
              <>
                <Text style={styles.subsectionTitle}>Supporting Messages:</Text>
                {segment.messagingHooks.supporting.map((hook, i) => (
                  <Text key={i} style={styles.listItem}>• {hook}</Text>
                ))}
              </>
            )}
          </View>
        )}
      </Page>
    ))}

    {/* Implementation Roadmap */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Implementation Roadmap</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Wins (30 Days)</Text>
        {result.implementationRoadmap.quickWins.map((win, i) => (
          <Text key={i} style={styles.listItem}>{i + 1}. {win}</Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phase 1: Foundation (0-3 months)</Text>
        {result.implementationRoadmap.phased.phase1.map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phase 2: Scaling (3-6 months)</Text>
        {result.implementationRoadmap.phased.phase2.map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phase 3: Optimization (6-12 months)</Text>
        {result.implementationRoadmap.phased.phase3.map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
      </View>
    </Page>
  </Document>
);

// Export component wrapper
export const PDFExportButton = ({ result, children }: { result: SegmentationResult; children: React.ReactNode }) => {
  const fileName = `market-segmentation-${new Date().toISOString().split('T')[0]}.pdf`;
  
  return (
    <PDFDownloadLink
      document={<SegmentationPDF result={result} />}
      fileName={fileName}
    >
      {({ blob, url, loading, error }) => 
        loading ? 'Preparing PDF...' : children
      }
    </PDFDownloadLink>
  );
};