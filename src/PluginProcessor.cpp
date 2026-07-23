#include "PluginProcessor.h"
#include "PluginEditor.h"

LuminaAudioProcessor::LuminaAudioProcessor()
    : AudioProcessor (BusesProperties()
                          .withInput ("Input", juce::AudioChannelSet::stereo(), true)
                          .withOutput ("Output", juce::AudioChannelSet::stereo(), true))
{
}

void LuminaAudioProcessor::prepareToPlay (double sampleRate, int)
{
    analysis.prepare (sampleRate);
}

bool LuminaAudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    const auto& in  = layouts.getMainInputChannelSet();
    const auto& out = layouts.getMainOutputChannelSet();

    if (in != out)
        return false;

    return in == juce::AudioChannelSet::mono() || in == juce::AudioChannelSet::stereo();
}

void LuminaAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;

    const int numSamples  = buffer.getNumSamples();
    const int numChannels = buffer.getNumChannels();

    if (numSamples <= 0 || numChannels <= 0)
        return;

    const float* l = buffer.getReadPointer (0);
    const float* r = numChannels > 1 ? buffer.getReadPointer (1) : l;

    analysis.push (l, r, numSamples);

    /* pure pass-through: the buffer is left untouched */
}

juce::AudioProcessorEditor* LuminaAudioProcessor::createEditor()
{
    return new LuminaAudioProcessorEditor (*this);
}

void LuminaAudioProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    juce::ValueTree tree ("LuminaState");
    tree.setProperty ("ui", getUiState(), nullptr);
    tree.setProperty ("w", editorW.load(), nullptr);
    tree.setProperty ("h", editorH.load(), nullptr);

    if (auto xml = tree.createXml())
        copyXmlToBinary (*xml, destData);
}

void LuminaAudioProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    if (auto xml = getXmlFromBinary (data, sizeInBytes))
    {
        auto tree = juce::ValueTree::fromXml (*xml);
        if (tree.hasType ("LuminaState"))
        {
            setUiState (tree.getProperty ("ui", "").toString());
            editorW = (int) tree.getProperty ("w", 1100);
            editorH = (int) tree.getProperty ("h", 700);

            /* if the editor is currently open, push the restored state to it (on the message thread) */
            if (auto* ed = dynamic_cast<LuminaAudioProcessorEditor*> (getActiveEditor()))
            {
                juce::Component::SafePointer<LuminaAudioProcessorEditor> safe (ed);
                juce::MessageManager::callAsync ([safe]
                {
                    if (safe != nullptr)
                        safe->pushStateToWeb();
                });
            }
        }
    }
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new LuminaAudioProcessor();
}
